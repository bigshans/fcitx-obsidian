import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { exec } from 'child_process';

interface FcitxObsidianSettings {
    FcitxRemoteCmd: string;
}

type VimMode = 'insert' | 'normal' | 'visual'

const DefaultSetting: FcitxObsidianSettings = {
    FcitxRemoteCmd: '/usr/bin/fcitx5-remote'
};

function execAync(cmd: string): Promise<string> {
    return new Promise(
        (resolve, reject) => {
            exec(cmd, (error: any, stdout: any) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            })
        }
    );
}

export default class FcitxObsidian extends Plugin {
    settings: FcitxObsidianSettings;
    private inputToggle: boolean;

    async onload() {
        this.settings = { ...DefaultSetting };
        this.addSettingTab(new FcitxObsidianSettingTab(this.app, this));
        this.app.workspace.on('file-open', async (_file) => {
            const view = this.getActiveView();
            if (view) {
                const editor = this.getCodeMirror(view);
                if (editor) {
                    // @ts-ignore
                    editor.on('vim-mode-change', (mode: { mode: VimMode }) => {
                        this.vimModeChange(mode.mode);
                    });
                }
            }
        });
    }

    private async vimModeChange(mode: VimMode) {
        if (mode !== 'insert') {
            if (await this.isActive()) {
                this.inputToggle = true;
                this.deactive();
            }
        } else {
            if (this.inputToggle) {
                this.active();
            }
            this.inputToggle = false;
        }
    }

    private getActiveView(): MarkdownView {
        return this.app.workspace.getActiveViewOfType(MarkdownView);
    }

    private getCodeMirror(view: MarkdownView): CodeMirror.Editor {
        // For CM6 this actually returns an instance of the object named CodeMirror from cm_adapter of codemirror_vim
        return (view as any).sourceMode?.cmEditor?.cm?.cm;
    }

    private async getState(): Promise<number> {
        return +(await execAync(this.settings.FcitxRemoteCmd));
    }

    private async active() {
        return exec(`${this.settings.FcitxRemoteCmd} -o`);
    }

    private async deactive() {
        return exec(`${this.settings.FcitxRemoteCmd} -c`);
    }

    private async isActive() {
        return await this.getState() === 2;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DefaultSetting, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class FcitxObsidianSettingTab extends PluginSettingTab {
    constructor(
        app: App,
        private plugin: FcitxObsidian
    ) {
        super(app, plugin);
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Fcitx Obsidian Settings.' });
        new Setting(containerEl)
            .setName('Fcitx Remote Cmd')
            .setDesc('Command for fcitx-remote(must be executable)')
            .addText(text => text
                    .setValue(this.plugin.settings.FcitxRemoteCmd)
                    .onChange(async (value) => {
                        this.plugin.settings.FcitxRemoteCmd = value;
                        await this.plugin.saveSettings();
                    }));
    }
}

