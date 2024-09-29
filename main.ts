import { Notice, Plugin, Platform } from "obsidian";
import { Jimp } from 'jimp'

export default class CopyImagePlugin extends Plugin {
	async onload() {
		if (Platform.isMobile) {
			this.registerDomEvent(
				document,
				"touchstart",
				async (evt: TouchEvent) => {
					if (this.isImage(evt)) {
						new Notice("Copying the image...");
						await this.copyImageToClipboard(evt);
					}
				}
			);
		} else {
			this.registerDomEvent(
				document,
				"contextmenu",
				async (evt: MouseEvent) => {
					if (this.isImage(evt)) {
						try {
							new Notice("Copying the image...");
							await this.trySetFocus();
							await this.waitForFocus();
							await this.copyImageToClipboard(evt);
						} catch (e) {
							new Notice(e.message);
						}
					}
				}
			);
		}
	}

	onunload() { }

	private async wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private isImage(evt: MouseEvent | TouchEvent) {
		return (
			evt.target instanceof HTMLImageElement &&
			evt.target.tagName === "IMG"
		);
	}

	private async trySetFocus() {
		if (!document.hasFocus()) {
			const obsidianWindow = window.open("obsidian://open", "_self");
			if (obsidianWindow) {
				obsidianWindow.focus();
			} else {
				throw new Error("Failed to focus Obsidian app.");
			}
		}
	}

	private async waitForFocus() {
		let timeElapsed = 0;

		while (!document.hasFocus() && timeElapsed < 2000) {
			await this.wait(50);
			timeElapsed += 50;
		}

		if (!document.hasFocus()) {
			throw new Error(
				"Cannot copy image to clipboard without Obsidian app focused."
			);
		}
	}

	private async copyImageToClipboard(evt: MouseEvent | TouchEvent) {
		const target = evt.target as HTMLImageElement;
		const response = await fetch(target.src);
		const imageBlob = await response.blob();
		if (imageBlob.type === "image/png") {
			await this.copyPngToClipboard(imageBlob)
		} else {
			await this.copyNonPngToClipboard(imageBlob);
		}
	}

	private async copyPngToClipboard(imageBlob: Blob) {
		try {
			await navigator.clipboard
				.write([
					new ClipboardItem({
						[imageBlob.type]: imageBlob,
					}),
				])
			new Notice("Image copied to clipboard!");
		} catch (error) {
			new Notice("Failed to copy...");
		}
	}

	private async copyNonPngToClipboard(imageBlob: Blob) {
		const image = await Jimp.read(URL.createObjectURL(imageBlob))
		const buffer= await image.getBuffer("image/png")
		const blob = new Blob([buffer], {type: "image/png"})
		this.copyPngToClipboard(blob)
	}
}
