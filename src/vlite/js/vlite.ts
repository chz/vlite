/**
 * @license MIT
 * @name Vlitejs
 * @version 4.0.0
 * @author: Yoriiis aka Joris DANIEL <joris.daniel@gmail.com>
 * @description: vLitejs is a fast and lightweight JavaScript library to customize and skin video and audio player with a minimalist theme (HTML5, Youtube, Vimeo)
 * {@link https://yoriiis.github.io/vlitejs}
 * @copyright 2021 Joris DANIEL <https://yoriiis.github.io/vlitejs>
 **/

import Player from './player'
import validateTarget from 'validate-target'
import { capitalized, checkSupportFullScreen, getCSSTransitionDuration } from 'shared/utils/utils'
import LoaderTemplate from 'shared/loader/assets/scripts/loader'
import BigPlayTemplate from 'shared/big-play/assets/scripts/big-play'
import OverlayTemplate from 'shared/overlay/assets/scripts/overlay'
import PosterTemplate from 'shared/poster/assets/scripts/poster'
import { Options, FullScreenSupport } from 'shared/assets/interfaces/interfaces'
import { registerProvider, getProviderInstance } from '../../providers/provider'
import { getPluginInstance, registerPlugin, initializePlugins } from '../../plugins/plugin'

type TimerHandle = number

export interface interfaceDefaultOptions {
	[key: string]: {
		[key: string]: any
	}
}

const DEFAULT_OPTIONS: interfaceDefaultOptions = {
	audio: {
		autoplay: false,
		controls: true,
		playPause: true,
		progressBar: true,
		time: true,
		volume: true,
		loop: false
	},
	video: {
		autoplay: false,
		controls: true,
		playPause: true,
		progressBar: true,
		time: true,
		volume: true,
		fullscreen: true,
		poster: null,
		bigPlay: true,
		autoHide: false,
		playsinline: true,
		loop: false,
		muted: false
	}
}

/**
 * Vlitejs entrypoint
 * @module vLite/entrypoint
 */
class Vlitejs {
	Player: any
	media: HTMLVideoElement | HTMLAudioElement
	plugins: Array<string>
	onReady: Function
	delayAutoHide: number
	type: string
	supportFullScreen: FullScreenSupport
	options: Options
	isPaused: Boolean
	autoHideGranted: Boolean
	container: HTMLElement
	player: any
	controlBar: any
	registerPlugin!: Function
	registerProvider!: Function
	timerAutoHide!: TimerHandle

	/**
	 * @constructor
	 * @param {(String|HTMLElement)} selector CSS selector or HTML element
	 * @param {Object} options
	 * @param {Object} options.options Player options
	 * @param {String} options.provider Player provider
	 * @param {Object} options.plugins Player plugins
	 * @param {Function} options.onReady Callback function when the player is ready
	 */
	constructor(
		selector: string | HTMLElement,
		{
			options,
			provider = 'html5',
			plugins = [],
			onReady
		}: {
			options: Options
			provider: string
			plugins: Array<string>
			onReady: Function
		}
	) {
		// Detect the type of the selector (string or HTMLElement)
		if (typeof selector === 'string') {
			// @ts-ignore: Object is possibly 'null'.
			this.media = document.querySelector(selector)
		} else if (selector instanceof HTMLVideoElement || selector instanceof HTMLAudioElement) {
			this.media = selector
		} else {
			throw new TypeError('vlitejs :: The element or selector supplied is not valid.')
		}

		this.plugins = plugins
		this.onReady = onReady
		this.isPaused = true
		this.delayAutoHide = 3000
		this.type = this.media instanceof HTMLAudioElement ? 'audio' : 'video'

		// Check fullscreen support API on different browsers and cached prefixs
		this.supportFullScreen = checkSupportFullScreen()

		// Update config from element attributes
		const domAttributes: Array<string> = ['autoplay', 'playsinline', 'muted', 'loop']
		domAttributes.forEach((item: string) => {
			if (this.media.hasAttribute(item)) {
				// @ts-ignore
				options[item] = true
				// @ts-ignore
			} else if (options[item]) {
				this.media.setAttribute(item, '')
			}
		})

		this.options = { ...DEFAULT_OPTIONS[this.type], ...options }
		this.autoHideGranted =
			this.type === 'video' && !!this.options.autoHide && !!this.options.controls

		this.onClickOnPlayer = this.onClickOnPlayer.bind(this)
		this.onDoubleClickOnPlayer = this.onDoubleClickOnPlayer.bind(this)
		this.onKeydown = this.onKeydown.bind(this)
		this.onMousemove = this.onMousemove.bind(this)
		this.onChangeFullScreen = this.onChangeFullScreen.bind(this)

		const ProviderInstance = getProviderInstance(provider)

		this.wrapElement()
		this.container = this.media.parentNode as HTMLElement

		this.type === 'video' && this.renderLayout()
		this.player = new ProviderInstance({
			type: this.type,
			Vlitejs: this
		})

		this.player.build()
		this.addEvents()

		initializePlugins({
			plugins,
			provider,
			type: this.type,
			player: this.player
		})
	}

	/**
	 * Wrap the media element
	 */
	wrapElement() {
		const wrapper = document.createElement('div')
		wrapper.classList.add(
			'v-vlite',
			'v-firstStart',
			'v-paused',
			'v-loading',
			`v-style${capitalized(this.type)}`
		)
		wrapper.setAttribute('tabindex', '0')
		const parentElement = this.media.parentNode as HTMLElement
		parentElement.insertBefore(wrapper, this.media)
		wrapper.appendChild(this.media)
	}

	/**
	 * Build the DOM of the player
	 */
	renderLayout() {
		const template = `
			${OverlayTemplate()}
			${LoaderTemplate()}
			${this.options.poster ? PosterTemplate({ posterUrl: this.options.poster }) : ''}
			${this.options.bigPlay ? BigPlayTemplate() : ''}
		`
		this.container.insertAdjacentHTML('beforeend', template)
	}

	/**
	 * Add evnets listeners
	 */
	addEvents() {
		if (this.type === 'video') {
			this.container.addEventListener('click', this.onClickOnPlayer)
			this.container.addEventListener('dblclick', this.onDoubleClickOnPlayer)
			this.autoHideGranted && this.container.addEventListener('mousemove', this.onMousemove)
			window.addEventListener(this.supportFullScreen.changeEvent, this.onChangeFullScreen)
		}
		document.addEventListener('keydown', this.onKeydown)
	}

	/**
	 * On click on the player
	 * @param {Object} e Event data
	 */
	onClickOnPlayer(e: Event) {
		const target = e.target
		const validateTargetPlayPauseButton = validateTarget({
			target: target,
			selectorString: '.v-poster, .v-overlay, .v-bigPlay',
			nodeName: ['div', 'button']
		})

		if (validateTargetPlayPauseButton) {
			this.togglePlayPause(e)
		}
	}

	/**
	 * On double click on the player
	 * @param {Object} e Event data
	 */
	onDoubleClickOnPlayer(e: Event) {
		const target = e.target
		const validateTargetOverlay = validateTarget({
			target: target,
			selectorString: '.v-overlay',
			nodeName: ['div']
		})

		if (validateTargetOverlay) {
			this.controlBar.toggleFullscreen(e)
		}
	}

	/**
	 * On keydown event on the media element
	 * @param {Object} e Event listener datas
	 */
	onKeydown(e: KeyboardEvent) {
		// Stop and start the auto hide timer on selected key code
		const validKeyCode = [9, 32, 37, 39]
		if (this.autoHideGranted && validKeyCode.includes(e.keyCode)) {
			this.stopAutoHideTimer()
			this.startAutoHideTimer()
		}

		// Prevent default behavior for fast forward navigation to prevent input range calls
		const preventDefaultKeyCode = [37, 39]
		preventDefaultKeyCode.includes(e.keyCode) && e.preventDefault()

		if (e.keyCode === 32) {
			// Toggle the media element on spacebar press
			this.togglePlayPause(e)
		} else if (e.keyCode === 37) {
			// Backward the media element on arrow left press
			this.fastForward('backward')
		} else if (e.keyCode === 39) {
			// Forward the media element on arrow right press
			this.fastForward('forward')
		} else if (e.keyCode === 38) {
			this.animateVolumeButton()
			this.increaseVolume()
		} else if (e.keyCode === 40) {
			this.animateVolumeButton()
			this.decreaseVolume()
		}
	}

	/**
	 * On mousemove on the player
	 */
	onMousemove() {
		if (!this.isPaused) {
			this.stopAutoHideTimer()
			this.startAutoHideTimer()
		}
	}

	/**
	 * On fullscreen change (espace key pressed)
	 * @doc https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
	 * @param {Object} e Event data
	 */
	onChangeFullScreen(e: Event) {
		if (!document[this.supportFullScreen.isFullScreen] && this.player.isFullScreen) {
			this.player.exitFullscreen({ escKey: true })
		}
	}

	/**
	 * On toggle play/pause
	 * @param {(Event|KeyboardEvent)} e Event data
	 */
	togglePlayPause(e: Event | KeyboardEvent) {
		e.preventDefault()

		this.container.classList.contains('v-paused') ? this.player.play() : this.player.pause()
	}

	/**
	 * Trigger the video fast forward (front and rear)
	 * @param {String} direction Direction (backward|forward)
	 */
	fastForward(direction: string) {
		this.player.getCurrentTime().then((seconds: number) => {
			this.player.seekTo(direction === 'backward' ? seconds - 5 : seconds + 5)
		})
	}

	/**
	 * Increase the player volume
	 */
	increaseVolume() {
		const volume = this.player.getVolume().then((volume: number) => {
			this.player.setVolume(volume + 0.05)
		})
	}

	/**
	 * Decrease the player volume
	 */
	decreaseVolume() {
		const volume = this.player.getVolume().then((volume: number) => {
			this.player.setVolume(volume - 0.05)
		})
	}

	/**
	 * Animate the volume button in CSS
	 */
	animateVolumeButton() {
		const volumeButton = this.container.querySelector('.v-volumeButton') as HTMLElement

		if (volumeButton) {
			const duration = getCSSTransitionDuration({
				target: volumeButton,
				isMilliseconds: true
			})
			volumeButton.classList.add('v-animate')
			setTimeout(() => volumeButton.classList.remove('v-animate'), duration)
		}
	}

	/**
	 * Stop the auto hide timer and show the video control bar
	 */
	stopAutoHideTimer() {
		const controlBar = this.container.querySelector('.v-controlBar')
		if (this.type === 'video' && controlBar) {
			controlBar.classList.remove('hidden')
			clearTimeout(this.timerAutoHide)
		}
	}

	/**
	 * Start the auto hide timer and hide the video control bar after a delay
	 */
	startAutoHideTimer() {
		const controlBar = this.container.querySelector('.v-controlBar')
		if (this.type === 'video' && !this.isPaused && controlBar) {
			this.timerAutoHide = window.setTimeout(() => {
				controlBar.classList.add('hidden')
			}, this.delayAutoHide)
		}
	}

	/**
	 * Update the loader status
	 * @param {Boolean} state Status of the loader
	 */
	loading(state: Boolean) {
		this.container.classList[state ? 'add' : 'remove']('v-loading')
		this.player.dispatchEvent('progress')
	}

	/**
	 * Remove events listeners
	 */
	removeEvents() {
		document.removeEventListener('keydown', this.onKeydown)

		if (this.type === 'video') {
			this.container.removeEventListener('click', this.onClickOnPlayer)
			this.container.removeEventListener('dblclick', this.onDoubleClickOnPlayer)
			this.autoHideGranted && this.container.removeEventListener('mousemove', this.onMousemove)
			window.removeEventListener(this.supportFullScreen.changeEvent, this.onChangeFullScreen)
		}
	}

	/**
	 * Destroy the player
	 */
	destroy() {
		this.removeEvents()
		this.player.destroy()
		this.controlBar.destroy()
	}
}

// Expose the Player instance, used by the provider API
// @ts-ignore
Vlitejs.Player = Player

// Expose the provider registration
// @ts-ignore
Vlitejs.registerProvider = registerProvider

// Expose the plugin registration
// @ts-ignore
Vlitejs.registerPlugin = registerPlugin

export default Vlitejs
