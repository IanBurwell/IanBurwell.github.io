import { AstroError } from "astro/errors";

const LETTER_WIDTH = 17;
const LETTER_HEIGHT = 35;
const LETTER_ANIMATION_DURATION = 2000;
const HOVER_ANIMATION_DURATION = 900;
const MINIMUM_ALPHA = 0.000001;

interface LetterPosition {
	x: number;
	y: number;
	letter: string;
	key: string;
}

type LetterSource = "ambient" | "hover";

interface LetterInstance extends LetterPosition {
	startAt: number;
	endAt: number;
	source: LetterSource;
}

declare global {
	interface Window {
		pageBackground?: PageBackground;
	}

	interface WindowEventMap {
		"page-background:ready": CustomEvent<PageBackground>;
	}
}

/**
 * PageBackground class
 */
class PageBackground {
	private LETTER_FADE_DURATION: [number, number] = [2, 7]; // Seconds

	private baseCanvas: HTMLCanvasElement;
	private overlayCanvas: HTMLCanvasElement;

	private baseCtx: CanvasRenderingContext2D;
	private overlayCtx: CanvasRenderingContext2D;

	private width: number = window.innerWidth;
	private height: number = window.innerHeight;

	private letterPositions: LetterPosition[] = [];
	private letterPositionsByKey = new Map<string, LetterPosition>();
	private letterInstances: LetterInstance[] = [];
	private letterInstancesByKey = new Map<string, LetterInstance>();
	private activeLetterKeys = new Set<string>();

	private primaryRgb: string;
	private easterEggEnabled = false;
	private pointerTrackingAttached = false;
	private lastHoveredKey: string | null = null;

	/**
	 * Initializes the background on the page.
	 * @param baseCanvas - The base canvas element. Used for static letters.
	 * @param overlayCanvas - The overlay canvas element. Used for animated letters.
	 */
	constructor(baseCanvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement) {
		// Get 2D context for both canvases
		const baseCtx = baseCanvas.getContext("2d");
		const overlayCtx = overlayCanvas.getContext("2d");

		// If either context is null, throw an error
		if (!baseCtx || !overlayCtx) {
			throw new AstroError("Unable to get 2D context.");
		}

		this.baseCanvas = baseCanvas;
		this.overlayCanvas = overlayCanvas;
		this.baseCtx = baseCtx;
		this.overlayCtx = overlayCtx;

		baseCanvas.width = this.width;
		baseCanvas.height = this.height;

		overlayCanvas.width = this.width;
		overlayCanvas.height = this.height;

		// Set the primary color to the first color in the theme
		this.primaryRgb = window
			.getComputedStyle(document.documentElement)
			.getPropertyValue("--primary-rgb")
			.trim();

		this.initBackground();

		requestAnimationFrame(this.redrawBackground);
	}

	private getPositionKey = (x: number, y: number) => `${x}:${y}`;

	private getRandomAmbientDelay = () => {
		return (
			(this.LETTER_FADE_DURATION[0] +
				Math.random() *
					(this.LETTER_FADE_DURATION[1] - this.LETTER_FADE_DURATION[0])) *
			1000
		);
	};

	private getLetterAlpha = (
		timestamp: number,
		startAt: number,
		endAt: number,
	) => {
		if (timestamp < startAt || timestamp > endAt) {
			return 0;
		}

		const progress = (timestamp - startAt) / (endAt - startAt);

		return Math.sin(progress * Math.PI);
	};

	private configureOverlayContext = () => {
		this.overlayCtx.font = "bold 28px Geist Mono";
		this.overlayCtx.textAlign = "start";
		this.overlayCtx.textBaseline = "top";
		this.overlayCtx.shadowBlur = 16;
	};

	private buildLetterInstance = (
		position: LetterPosition,
		source: LetterSource,
		startAt: number,
		duration: number,
	): LetterInstance => {
		return {
			...position,
			startAt,
			endAt: startAt + duration,
			source,
		};
	};

	private registerLetterInstance = (instance: LetterInstance) => {
		if (this.activeLetterKeys.has(instance.key)) {
			return false;
		}

		this.activeLetterKeys.add(instance.key);
		this.letterInstancesByKey.set(instance.key, instance);
		this.letterInstances.push(instance);

		return true;
	};

	private removeLetterInstance = (key: string) => {
		this.activeLetterKeys.delete(key);
		this.letterInstancesByKey.delete(key);
	};

	private getRandomInactiveLetterPosition = () => {
		const availableLetters = this.letterPositions.filter(
			(position) => !this.activeLetterKeys.has(position.key),
		);

		if (availableLetters.length === 0) {
			return null;
		}

		return this.getRandomAmountFromArray<LetterPosition>(
			availableLetters,
			1,
		)[0];
	};

	private addAmbientLetterInstance = (position?: LetterPosition | null) => {
		const nextPosition = position ?? this.getRandomInactiveLetterPosition();

		if (!nextPosition) {
			return false;
		}

		const startAt = Date.now() + this.getRandomAmbientDelay();
		const instance = this.buildLetterInstance(
			nextPosition,
			"ambient",
			startAt,
			LETTER_ANIMATION_DURATION,
		);

		return this.registerLetterInstance(instance);
	};

	private getLetterPositionAt = (x: number, y: number) => {
		const snappedX = Math.floor(x / LETTER_WIDTH) * LETTER_WIDTH;
		const snappedY = Math.floor(y / LETTER_HEIGHT) * LETTER_HEIGHT;

		if (
			snappedX < 0 ||
			snappedX >= this.width ||
			snappedY < 0 ||
			snappedY >= this.height
		) {
			return null;
		}

		return (
			this.letterPositionsByKey.get(this.getPositionKey(snappedX, snappedY)) ??
			null
		);
	};

	private clearHoveredLetter = () => {
		this.lastHoveredKey = null;
	};

	private triggerHoverLetter = (position: LetterPosition) => {
		const existingInstance = this.letterInstancesByKey.get(position.key);
		const startAt = Date.now();

		if (existingInstance) {
			if (existingInstance.source === "hover") {
				return;
			}

			existingInstance.source = "hover";
			existingInstance.startAt = startAt;
			existingInstance.endAt = startAt + HOVER_ANIMATION_DURATION;
			this.addAmbientLetterInstance();

			return;
		}

		this.registerLetterInstance(
			this.buildLetterInstance(
				position,
				"hover",
				startAt,
				HOVER_ANIMATION_DURATION,
			),
		);
	};

	private handlePointerMove = (event: PointerEvent) => {
		if (!this.easterEggEnabled) {
			return;
		}

		const letterPosition = this.getLetterPositionAt(
			event.clientX,
			event.clientY,
		);

		if (!letterPosition) {
			this.lastHoveredKey = null;
			return;
		}

		if (this.lastHoveredKey === letterPosition.key) {
			return;
		}

		this.lastHoveredKey = letterPosition.key;
		this.triggerHoverLetter(letterPosition);
	};

	private attachPointerTracking = () => {
		if (this.pointerTrackingAttached) {
			return;
		}

		window.addEventListener("pointermove", this.handlePointerMove, {
			passive: true,
		});
		this.overlayCanvas.addEventListener(
			"pointerleave",
			this.clearHoveredLetter,
		);
		window.addEventListener("blur", this.clearHoveredLetter);
		this.pointerTrackingAttached = true;
	};

	public enableHoverEasterEgg = () => {
		this.easterEggEnabled = true;
		this.attachPointerTracking();
	};

	/**
	 * Sets up the background canvases. The text is decided based on the title of the page.
	 */
	private initBackground = () => {
		let text: string =
			document.title.toLowerCase().split(" | ")[0].replace(/\s/g, "_") ||
			"Burwell";

		// Add additional underscore to separate words
		if (text.includes("_")) {
			text += "_";
		}

		const letters = Math.ceil(this.width / LETTER_WIDTH);
		const lines = Math.ceil(this.height / LETTER_HEIGHT);

		// Loop through the canvas and draw the text
		this.baseCtx.font = "28px Geist Mono";
		this.baseCtx.textAlign = "start";
		this.baseCtx.textBaseline = "top";
		this.baseCtx.fillStyle = "rgba(255, 255, 255, 0.02)";

		let currentShift = 0;
		for (let i = 0; i < lines; i++) {
			for (let j = 0; j < letters; j++) {
				const charIndex =
					(((j + currentShift) % text.length) + text.length) % text.length;
				const x = j * LETTER_WIDTH;
				const y = i * LETTER_HEIGHT;
				const position = {
					x,
					y,
					letter: text[charIndex],
					key: this.getPositionKey(x, y),
				};

				this.baseCtx.fillText(position.letter, position.x, position.y);
				this.letterPositions.push(position);
				this.letterPositionsByKey.set(position.key, position);
			}
			// Randomly shift +1 or -1 for the next line
			currentShift += Math.random() > 0.5 ? 1 : -1;
		}

		// Randomly select 75% of the letters to animate
		const randomLetters = this.getRandomAmountFromArray<LetterPosition>(
			this.letterPositions,
			Number.parseInt((lines * 0.75).toFixed(), 10),
		);

		this.configureOverlayContext();
		this.overlayCtx.fillStyle = `rgba(${this.primaryRgb}, 0)`;
		this.overlayCtx.shadowColor = `rgba(${this.primaryRgb}, 0)`;

		for (const letter of randomLetters) {
			this.addAmbientLetterInstance(letter);
		}

		// Make the base canvas visible
		this.baseCanvas.style.opacity = "1";
	};

	/**
	 * Grabs n random elements from an array.
	 * @param arr - The array to grab elements from.
	 * @param n - The number of elements to grab.
	 * @returns - An array of n elements.
	 */
	private getRandomAmountFromArray = <T>(arr: Array<T>, n = 20): Array<T> => {
		let len = arr.length;

		// Initialize arrays beforehand
		const result = new Array<T>(n);
		const taken = new Array<number>(len);

		if (n > len) {
			throw new AstroError(
				"getRandomAmountFromArray: more elements taken than available",
			);
		}

		while (n--) {
			const x = Math.floor(Math.random() * len);
			result[n] = arr[x in taken ? taken[x] : x];
			taken[x] = --len in taken ? taken[len] : len;
		}

		return result;
	};

	/**
	 * Redraws the overlay canvas and animates the letters.
	 */
	private redrawBackground = () => {
		// Clear the overlay canvas
		this.overlayCtx.clearRect(
			0,
			0,
			this.overlayCanvas.width,
			this.overlayCanvas.height,
		);

		this.configureOverlayContext();

		const now = Date.now();
		const nextLetterInstances: LetterInstance[] = [];
		let ambientReplacements = 0;

		for (const letter of this.letterInstances) {
			const alpha = this.getLetterAlpha(now, letter.startAt, letter.endAt);

			if (alpha <= MINIMUM_ALPHA && now > letter.endAt) {
				this.removeLetterInstance(letter.key);

				if (letter.source === "ambient") {
					ambientReplacements += 1;
				}

				continue;
			}

			if (alpha > MINIMUM_ALPHA) {
				this.overlayCtx.fillStyle = `rgba(${this.primaryRgb}, ${alpha})`;
				this.overlayCtx.shadowColor = `rgba(${this.primaryRgb}, ${alpha})`;
				this.overlayCtx.fillText(letter.letter, letter.x, letter.y);
			}

			nextLetterInstances.push(letter);
		}

		this.letterInstances = nextLetterInstances;

		for (let index = 0; index < ambientReplacements; index++) {
			this.addAmbientLetterInstance();
		}

		requestAnimationFrame(this.redrawBackground);
	};

	/**
	 * Resizes the background canvases.
	 */
	public resizeBackground = () => {
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.baseCanvas.width = this.width;
		this.baseCanvas.height = this.height;

		this.overlayCanvas.width = this.width;
		this.overlayCanvas.height = this.height;

		this.baseCtx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
		this.overlayCtx.clearRect(
			0,
			0,
			this.overlayCanvas.width,
			this.overlayCanvas.height,
		);

		this.letterPositionsByKey.clear();
		this.letterInstances = [];
		this.letterInstancesByKey.clear();
		this.activeLetterKeys.clear();
		this.letterPositions = [];
		this.lastHoveredKey = null;

		this.initBackground();
	};
}

/**
 * Loads the Geist Mono font. We have to do this asynchronously because the font is not preloaded.
 */
async function loadFont() {
	const font = new FontFace("Geist Mono", "url(/fonts/GeistMono.woff2)");

	await font.load();

	document.fonts.add(font);
}

/**
 * First loads the Geist Mono font, then initializes the background.
 */
async function initializeBackground() {
	await loadFont();

	const canvas = document.getElementById("bg-canvas");
	const overlayCanvas = document.getElementById("overlay-canvas");

	if (
		!(canvas instanceof HTMLCanvasElement) ||
		!(overlayCanvas instanceof HTMLCanvasElement)
	) {
		throw new AstroError("Background canvas elements not found.");
	}

	const background = new PageBackground(canvas, overlayCanvas);
	window.pageBackground = background;
	window.dispatchEvent(
		new CustomEvent("page-background:ready", { detail: background }),
	);

	window.addEventListener("resize", () => {
		background.resizeBackground();
	});
}

initializeBackground();
