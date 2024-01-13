import { Notice, Plugin } from "obsidian";

export default class CopyImagePlugin extends Plugin {
	async onload() {
		this.registerDomEvent(document, "contextmenu", (evt: MouseEvent) => {
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
								new Notice("Copied image URL to clipboard!");
							})
							.catch(() => {
								new Notice("Failed to copy image URL to clipboard!");
							});
						break;
					}
				}
			})();
		});
	}

	onunload() {}
}
