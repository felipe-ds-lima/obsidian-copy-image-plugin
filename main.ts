import { Notice, Plugin } from "obsidian";

interface CopyImagePluginSettings {
	mySetting: string;
}

export default class CopyImagePlugin extends Plugin {
	settings: CopyImagePluginSettings;

	async onload() {
		await this.loadSettings();

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
							});
						break;
					}
				}
			})();
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
