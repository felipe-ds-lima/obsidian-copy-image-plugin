import { Notice, Plugin, Platform, Editor, MarkdownView, PluginSettingTab, App, Setting,  } from "obsidian";
import { Jimp } from 'jimp'

interface CopyImagePluginSettings {
  svgToPngScale: number;
}

const DEFAULT_SETTINGS: CopyImagePluginSettings = {
  svgToPngScale: 4
};

export default class CopyImagePlugin extends Plugin {
	settings: CopyImagePluginSettings;

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	touchTime = 0;
	targetImage: HTMLImageElement | null = null;

	async onload() {
		await this.loadSettings();

		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, info)=>{
		if(!this.targetImage) return;
			menu.addItem((item) =>
				item
          .setTitle('Copy image to clipboard')
          .setIcon('image')
          .onClick(()=>this.handleMenuOption())
          .setDisabled(!this.targetImage)
			);
		}))

		this.addSettingTab(new CopyImagePluginSettingsTab(this.app, this));

		if (Platform.isMobile) {
			this.registerDomEvent(
				document,
				"touchstart",
				this.handleTouchStart.bind(this)
			);

			this.registerDomEvent(
				document,
				"touchmove",
				this.handleTouchMove.bind(this)
			);
		} else {
			this.registerDomEvent(
				document,
				"contextmenu",
				this.handleContextMenu.bind(this),
        {capture: true}
			);
		}

		this.addCommand({
			id: 'copy-image',
			name: 'Copy image to clipboard',
			editorCallback: this.handleCommand.bind(this),
		});
	}

	onunload() {
	}

	private async handleCommand(editor: Editor, view: MarkdownView) {
		const line = editor.getLine(editor.getCursor().line)
		if (!line.includes('![[')) {
			new Notice("Not an image file or not supported...");
			return
		}
		let fileNane = line.replace(/.*!\[\[(.*?)\]\].*/, '$1');
		if (fileNane === '') {
			new Notice("Not an image file or not supported...");
			return
		}
		if (fileNane.includes('|')) {
			fileNane = fileNane.split('|')[0]
		}
		const ext = fileNane.split('.').pop()
		if (!ext) {
			new Notice("Not an image file or not supported...");
			return
		}
		if (!['bmp', 'gif', 'jpeg', 'jpg', 'png', 'tiff'].includes(ext)) {
			new Notice("Not an image file or not supported...");
			return
		}

		this.app.vault.getFiles().forEach(async file => {
			if (file.name === fileNane) {
				new Notice("Copying the image...");
				const url = this.app.vault.adapter.getResourcePath(file.path)
				const response = await fetch(url);
				const imageBlob = await response.blob();

				if (imageBlob.type === "image/png") {
					await this.copyPngToClipboard(imageBlob)
				} else {
					await this.copyNonPngToClipboard(imageBlob);
				}
			}
		})
	}

  
	private async handleMenuOption() {
    try {
      new Notice("Copying the image...");
      await this.trySetFocus();
      await this.waitForFocus();
      await this.copyImageToClipboard(undefined, this.targetImage || undefined);
    } catch (e) {
      new Notice(e.message);
    }
	}

	private async handleTouchStart(evt: TouchEvent) {
		if (this.isImage(evt)) {
			this.touchTime = new Date().getTime();

			setTimeout(async () => {
				if (this.touchTime !== 0) {
					new Notice("Copying the image...");
					await this.copyImageToClipboard(evt);
				}
			}, 1000);
		}
	}
	private async handleTouchMove(evt: TouchEvent) {
		if (this.isImage(evt)) {
			this.touchTime = 0;
		}
	}

	private async handleContextMenu(evt: MouseEvent) {
		if (this.isImage(evt)) {
			this.targetImage = evt.target as HTMLImageElement;
		} else if (this.targetImage) {
			this.targetImage = null;
		}
	}

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

	private async copyImageToClipboard(evt?: MouseEvent | TouchEvent, targetImage?: HTMLImageElement) {
		const target = evt?.target as HTMLImageElement || targetImage;
    if(!target) return;
		const response = await fetch(target.src);
		const imageBlob = await response.blob();
		if (imageBlob.type === "image/png") {
			await this.copyPngToClipboard(imageBlob)
		} else if (imageBlob.type === "image/svg+xml") {
			// for obsidian-excalidraw-plugin plugin
			await this.copySvgToClipboard(imageBlob);
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

	private async copySvgToClipboard(imageBlob: Blob) {
		try {
			// 1. Create a URL for the SVG Blob
			const url = URL.createObjectURL(imageBlob);
			const img = new Image();

			// 2. Load the image asynchronously
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = () => {
					new Notice("Failed to load SVG image for conversion.");
					reject();
				};
				img.src = url;
			});

			// 3. Setup Canvas for rasterization
			const canvas = document.createElement('canvas');
			// Increased scaling factor for higher resolution output
			const scale = this.settings.svgToPngScale;
			canvas.width = (img.width || 300) * scale;
			canvas.height = (img.height || 300) * scale;

			const ctx = canvas.getContext('2d');
			if (!ctx) {
				new Notice("Could not create canvas context.");
				return;
			}

			// 4. Draw SVG to Canvas
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			// 5. Convert Canvas to PNG Blob
			canvas.toBlob(async (pngBlob) => {
				if (pngBlob) {
					// 6. Reuse your existing function for PNG handling
					await this.copyPngToClipboard(pngBlob);
				} else {
					new Notice("Failed to convert SVG to PNG.");
				}
				
				// Clean up memory
				URL.revokeObjectURL(url);
			}, 'image/png');

		} catch (err) {
			new Notice("Error during SVG to PNG conversion.");
		}
	}

	private async copyNonPngToClipboard(imageBlob: Blob) {
		const image = await Jimp.read(URL.createObjectURL(imageBlob))
		const buffer = await image.getBuffer("image/png")
		const blob = new Blob([buffer], { type: "image/png" })
		this.copyPngToClipboard(blob)
	}
}

class CopyImagePluginSettingsTab extends PluginSettingTab {
	plugin: CopyImagePlugin;

	constructor(app: App, plugin: CopyImagePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("SVG to PNG Scale")
			.setDesc("The scaling factor for the converted PNG. Higher values result in higher resolution.")
			.addSlider(slider => {
				slider
					.setValue(4)
					.setLimits(1, 10, 1)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.svgToPngScale)
					.onChange(async (value) => {
						this.plugin.settings.svgToPngScale = value;
						await this.plugin.saveSettings()
					})
			})
	}
}
