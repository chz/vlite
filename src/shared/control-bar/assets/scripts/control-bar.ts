import { formatVideoTime } from 'shared/utils/utils'
import validateTarget from 'validate-target'
import Template from './templates/control-bar'
import { Options } from 'shared/assets/interfaces/interfaces'

export default class ControlBar {
	player: any
	type: string

	/**
	 * @constructor
	 * @param {Object} options
	 * @param {Class} options.player Player instance
	 * @param {String} options.type Player type (video|audio)
	 */
	constructor({ player, type }: { player: any; type: string }) {
		this.type = type
		this.player = player

		this.onInputProgressBar = this.onInputProgressBar.bind(this)
		this.onClickOnControlBar = this.onClickOnControlBar.bind(this)
		this.togglePlayPause = this.togglePlayPause.bind(this)
		this.toggleVolume = this.toggleVolume.bind(this)
		this.toggleFullscreen = this.toggleFullscreen.bind(this)
	}

	/**
	 * Initialize the control bar
	 */
	init() {
		this.render()
		this.cacheElements()
		this.addEvents()
	}

	/**
	 * Cache control bar DOM elements
	 */
	cacheElements() {
		const controlBar = this.player.elements.container.querySelector('.v-controlBar')
		this.player.elements.controlBar = controlBar
		if (this.player.elements.controlBar) {
			this.player.elements.playPause = controlBar.querySelector('.v-playPauseButton')
			this.player.elements.progressBar = controlBar.querySelector('.v-progressBar')
			this.player.elements.currentTime = controlBar.querySelector('.v-currentTime')
			this.player.elements.duration = controlBar.querySelector('.v-duration')
			this.player.elements.volume = controlBar.querySelector('.v-volumeButton')

			this.player.elements.fullscreen = controlBar.querySelector('.v-fullscreenButton')

			if (this.player.elements.volume) {
				this.player.elements.volume.setAttribute(
					'aria-label',
					this.player.isMuted ? 'Unmute' : 'Mute'
				)
			}
		}
	}

	/**
	 * Render the control bar
	 */
	render() {
		this.player.elements.container.insertAdjacentHTML('beforeend', this.getTemplate())
	}

	/**
	 * On player ready
	 */
	onPlayerReady() {
		this.player.getDuration().then((duration: number) => {
			if (this.player.elements.progressBar) {
				this.player.elements.progressBar.setAttribute('aria-valuemax', `${Math.round(duration)}`)
			}
			if (this.player.elements.duration) {
				this.player.elements.duration.innerHTML = formatVideoTime(duration)
			}
		})
	}

	/**
	 * Add event listeners
	 */
	addEvents() {
		this.player.elements.progressBar &&
			this.player.elements.progressBar.addEventListener('input', this.onInputProgressBar)
		this.player.elements.controlBar &&
			this.player.elements.controlBar.addEventListener('click', this.onClickOnControlBar)
	}

	/**
	 * On input event on the progress bar
	 * @param {Object} e Event data
	 */
	onInputProgressBar(e: Event) {
		const target = e.target as HTMLInputElement
		target.style.setProperty('--value', `${target.value}%`)

		this.player.getDuration().then((duration: number) => {
			this.player.seekTo((parseInt(target.value) * duration) / 100)
		})
	}

	/**
	 * On click on the control bar
	 * @param {Object} e Event data
	 */
	onClickOnControlBar(e: Event) {
		const target = e.target

		const validateTargetPlayPauseButton = validateTarget({
			target: target,
			selectorString: '.v-playPauseButton',
			nodeName: ['button']
		})
		const validateTargetVolume = validateTarget({
			target: target,
			selectorString: '.v-volumeButton',
			nodeName: ['button']
		})
		const validateTargetFullscreen = validateTarget({
			target: target,
			selectorString: '.v-fullscreenButton',
			nodeName: ['button']
		})

		if (validateTargetPlayPauseButton) {
			this.togglePlayPause(e)
		} else if (validateTargetVolume) {
			this.toggleVolume(e)
		} else if (validateTargetFullscreen) {
			this.toggleFullscreen(e)
		}
	}

	/**
	 * Toggle the video status (play|pause)
	 */
	togglePlayPause(e: Event) {
		e && e.preventDefault()

		this.player.elements.container.classList.contains('v-paused')
			? this.player.play()
			: this.player.pause()
	}

	/**
	 * Toggle the volume
	 */
	toggleVolume(e: Event) {
		e.preventDefault()

		if (this.player.elements.volume!.classList.contains('v-pressed')) {
			this.player.unMute()
			this.player.elements.volume!.setAttribute('aria-label', 'Mute')
		} else {
			this.player.mute()
			this.player.elements.volume!.setAttribute('aria-label', 'Unmute')
		}
	}

	/**
	 * Toggle the fullscreen
	 */
	toggleFullscreen(e: Event) {
		e.preventDefault()

		if (this.player.isFullScreen) {
			this.player.exitFullscreen()
			this.player.elements.fullscreen!.setAttribute('aria-label', 'Enter fullscreen')
		} else {
			this.player.requestFullscreen()
			this.player.elements.fullscreen!.setAttribute('aria-label', 'Exit fullscreen')
		}
	}

	/**
	 * Get the template
	 * @param {Object} data Template's data
	 * @returns {String} Generated HTML
	 */
	getTemplate(): string {
		return `${Template({
			options: this.player.options,
			isMuted: this.player.isMuted,
			type: this.type
		})}`
	}

	/**
	 * Remove event listeners
	 */
	removeEvents() {
		if (this.player.elements.progressBar) {
			this.player.elements.progressBar.removeEventListener('input', this.onInputProgressBar)
		}

		this.player.elements.controlBar &&
			this.player.elements.controlBar.removeEventListener('click', this.onClickOnControlBar)
	}

	/**
	 * Destroy the control bar
	 */
	destroy() {
		this.removeEvents()
		this.player.elements.controlBar && this.player.elements.controlBar.remove()
	}
}
