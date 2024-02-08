import { Notice, Plugin, Platform } from "obsidian";

export default class CopyImagePlugin extends Plugin {
	async onload() {
		if (!Platform.isMobile) {
			this.registerDomEvent(
				document,
				"contextmenu",
				(evt: MouseEvent) => {
					if (Platform.isMacOS) {
						const obsidianWindow = window.open(
							"obsidian://open",
							"_self"
						);
						if (obsidianWindow) {
							obsidianWindow.focus();
						} else {
							new Notice("Failed to focus Obsidian window.");
						}
					}

					const images = document.getElementsByTagName("img");
					(async () => {
						for (let i = 0; i < images.length; i++) {
							if (images[i].contains(evt.target as Node)) {
								const response = await fetch(images[i].src);
								const imageBlob = await response.blob();
								navigator.clipboard
									.write([
										new ClipboardItem({
											[imageBlob.type]: imageBlob,
										}),
									])
									.then(() => {
										new Notice(
											"Copied image URL to clipboard!"
										);
									})
									.catch(() => {
										new Notice(
											"Failed to copy image URL to clipboard!"
										);
									});
								break;
							}
						}
					})();
				}
			);
		} else {
			// Mobile
			this.registerDomEvent(document, "touchstart", (evt: TouchEvent) => {
				const images = document.getElementsByTagName("img");
				(async () => {
					for (let i = 0; i < images.length; i++) {
						if (images[i].contains(evt.target as Node)) {
							const response = await fetch(images[i].src);
							const imageBlob = await response.blob();
							navigator.clipboard
								.write([
									new ClipboardItem({
										[imageBlob.type]: imageBlob,
									}),
								])
								.then(() => {
									new Notice(
										"Copied image URL to clipboard!"
									);
								})
								.catch(() => {
									new Notice(
										"Failed to copy image URL to clipboard!"
									);
								});
							break;
						}
					}
				})();
			});
		}
	}

	onunload() {}
}
