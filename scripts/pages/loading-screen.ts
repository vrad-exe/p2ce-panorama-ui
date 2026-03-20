'use strict';

class LoadingScreenController {
	static lastLoadedMapName = '';
	static logoEvent: number | undefined = undefined;
	static bgEvent: number | undefined = undefined;
	static bgEvent2: number | undefined = undefined;

	static progressBar = $('#ProgressBar') as ProgressBar;
	static bgImage1 = $('#BackgroundMapImage1') as Image;
	static bgImage2 = $('#BackgroundMapImage2') as Image;
	static logo = $<Image>('#Logo');
	static beBlankIfInvalid = false;

	static init() {
		this.progressBar.value = 0;

		this.bgImage2.RemoveClass('loadingscreen__backgroundshowanim');

		if (!this.bgEvent) {
			this.bgEvent = $.RegisterEventHandler('ImageFailedLoad', this.bgImage1, () => {
				if (this.beBlankIfInvalid) {
					this.bgImage1.visible = false;
				} else {
					this.bgImage1.SetImage(getRandomFallbackImage());
				}
			});
			this.bgEvent2 = $.RegisterEventHandler('ImageFailedLoad', this.bgImage1, () => {
				this.bgImage2.visible = false;
			});
		}

		if (this.logo) {
			if (!this.logoEvent) {
				this.logoEvent = $.RegisterEventHandler('ImageFailedLoad', this.logo, () => {
					$.Warning('LOADING SCREEN: Square logo was specified, but could not be loaded.');
					this.logo!.SetImage('file://{images}/menu/p2ce/logo.png');
				});
			}

			if (CampaignAPI.IsCampaignActive()) {
				const img = CampaignAPI.GetCampaignMeta(null).get(CampaignMeta.SQUARE_LOGO);
				if (img) {
					this.logo.SetImage(`${getCampaignAssetPath(CampaignAPI.GetActiveCampaign()!)}${img}`);
				} else {
					this.logo.SetImage('file://{images}/menu/p2ce/logo.png');
				}
			} else {
				this.logo.SetImage('file://{images}/menu/p2ce/logo.png');
			}
		}
	}

	static updateLoadingScreenInfoRepeater() {
		if (!this.bgImage2.visible) return;

		// Progress bar will be 1.0 when loading finishes and is then reset to 0.0
		if (this.progressBar.value >= 0.25) {
			this.bgImage2.AddClass('loadingscreen__backgroundshowanim');
			return;
		}

		// Rechecking every 8th of a second is OK, it doesn't need to be anything crazy
		$.Schedule(0.125, this.updateLoadingScreenInfoRepeater.bind(this));
	}

	static updateLoadingScreenInfo(mapName: string) {
		const useTransitScreen = this.lastLoadedMapName.length > 0;

		if (mapName.length > 0) this.lastLoadedMapName = mapName;

		if (CampaignAPI.IsCampaignActive()) {
			// get relevant information
			const c = CampaignAPI.GetActiveCampaign()!;
			const meta = CampaignAPI.GetCampaignMeta(null);

			if (this.logo) {
				const pad = Number(meta.get(CampaignMeta.LOADING_LOGO_PAD));
				if (!isNaN(pad)) {
					this.logo.style.padding = `${pad}px`;
				}
			}

			// applies image and sets panel if it's valid
			// otherwise, make it invisible
			const setImg = (panel: Image, path: string) => {
				if (path && path.length > 0) {
					panel.visible = true;
					panel.SetImage(`${getCampaignAssetPath(c)}${path}`);
				} else {
					panel.visible = false;
				}
			};


			let path: string;
			this.beBlankIfInvalid = isSingleWsCampaign(c);
			if (this.beBlankIfInvalid) {
				path = useTransitScreen ? 'transition_screen.png' : 'loading_screen.png';
			} else {
				const aspect = $.GetContextPanel().contentwidth / $.GetContextPanel().contentheight;
				const pathNonWide = meta.get(useTransitScreen ? CampaignMeta.TRANSITION_SCREEN_NONWIDE : CampaignMeta.LOADING_SCREEN_NONWIDE) ?? '';
				const pathUltraWide = meta.get(useTransitScreen ? CampaignMeta.TRANSITION_SCREEN_ULTRAWIDE : CampaignMeta.LOADING_SCREEN_ULTRAWIDE) ?? '';

				$.Msg(`Aspect Ratio: ${aspect}`);
				// Less than just below 16:10 is considered non-widescreen - C++ code does this (see vgui_int.cpp in Swarm SDK)
				if (aspect < 1.59 && pathNonWide && pathNonWide.length > 0) {
					path = pathNonWide
					$.Msg("Using 4:3 asset");
				} else if (aspect > 2.0 && pathUltraWide && pathUltraWide.length > 0) {
					path = pathUltraWide
					$.Msg("Using ultrawide asset");
				} else {
					path = meta.get(useTransitScreen ? CampaignMeta.TRANSITION_SCREEN : CampaignMeta.LOADING_SCREEN) ?? '';
					$.Msg("Using widescreen asset");
				}
			}

			$.Msg(`Image asset path: ${path}`);
			if (path && path.length > 0) {
				const split = (path as string).split('.');
				let join = '';
				for (let i = 0; i < split.length - 1; ++i) {
					join += split[i];
				}
				setImg(this.bgImage1, join + '_1.' + split[split.length - 1]);
				setImg(this.bgImage2, join + '_2.' + split[split.length - 1]);

				// Set scale type
				const scaling = meta.get(useTransitScreen ? CampaignMeta.TRANSITION_SCREEN_SCALING : CampaignMeta.LOADING_SCREEN_SCALING) as ImageScalingMode;
				$.Msg(`Image scaling mode: ${scaling}`);
				if (scaling && scaling.length > 0) {
					this.bgImage1.SetScaling(scaling);
				} else {
					// Default to cover mode, probably makes the most sense
					this.bgImage1.SetScaling(ImageScalingMode.STRETCH_TO_COVER_PRESERVE_ASPECT);
				}

				$.Schedule(0.125, this.updateLoadingScreenInfoRepeater.bind(this));
			} else {
				this.bgImage1.visible = false;
				this.bgImage2.visible = false;
			}
		} else {
			this.bgImage1.visible = false;
			this.bgImage2.visible = false;
		}
	}

	static {
		$.RegisterForUnhandledEvent('UnloadLoadingScreenAndReinit', this.init.bind(this));
		$.RegisterForUnhandledEvent('PopulateLoadingScreen', this.updateLoadingScreenInfo.bind(this));
		$.RegisterForUnhandledEvent('LoadingScreenClearLastMap', () => {
			this.lastLoadedMapName = '';
		});
	}
}
