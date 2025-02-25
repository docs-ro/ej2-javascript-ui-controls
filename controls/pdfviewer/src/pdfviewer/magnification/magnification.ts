/* eslint-disable */
import { Browser, isBlazor, isNullOrUndefined } from '@syncfusion/ej2-base';
import { PdfViewer, PdfViewerBase, TileRenderingSettingsModel } from '../index';
import { getDiagramElement, PointModel } from '@syncfusion/ej2-drawings';

/**
 * Magnification module
 */
export class Magnification {
    /**
     * @private
     */
    public zoomFactor: number = 1;
    /**
     * @private
     */
    public previousZoomFactor: number = 1;
    private scrollWidth: number = 25;
    private pdfViewer: PdfViewer;
    private pdfViewerBase: PdfViewerBase;
    private zoomLevel: number;
    private higherZoomLevel: number;
    private lowerZoomLevel: number;
    private zoomPercentages: number[] = [10, 25, 50, 75, 100, 125, 150, 200, 400];
    private isNotPredefinedZoom: boolean = false;
    private pinchStep: number = 0.02;
    private reRenderPageNumber: number = 0;
    // eslint-disable-next-line
    private magnifyPageRerenderTimer: any = null;
    // eslint-disable-next-line
    private rerenderOnScrollTimer: any = null;
    // eslint-disable-next-line
    private rerenderInterval: any = null;
    private previousTouchDifference: number;
    private touchCenterX: number = 0;
    private touchCenterY: number = 0;
    private pageRerenderCount: number = 0;
    private imageObjects: HTMLImageElement[] = [];
    private topValue: number = 0;
    private isTapToFitZoom: boolean = false;
    /**
     * @private
     */
    public fitType: string = null;
    /**
     * @private
     */
    public isInitialLoading: boolean;
    /**
     * @private
     */
    public isPinchZoomed: boolean = false;
    /**
     * @private
     */
    public isPagePinchZoomed: boolean = false;
    /**
     * @private
     */
    public isRerenderCanvasCreated: boolean = false;
    /**
     * @private
     */
    public isMagnified: boolean = false;
    /**
     * @private
     */
    public isPagesZoomed: boolean = false;
    /**
     * @private
     */
    public isPinchScrolled: boolean = false;
    /**
     * @private
     */
    public isAutoZoom: boolean = false;
    /**
     * @private
     */
    public isFormFieldPageZoomed: boolean = false;
    private isWebkitMobile: boolean = false;
    private isFitToPageMode: boolean = true;
    /**
     * @param pdfViewer
     * @param viewerBase
     * @private
     */
    constructor(pdfViewer: PdfViewer, viewerBase: PdfViewerBase) {
        this.pdfViewer = pdfViewer;
        this.pdfViewerBase = viewerBase;
        this.zoomLevel = 2;
        // eslint-disable-next-line max-len
        this.isWebkitMobile = /Chrome/.test(navigator.userAgent) || /Google Inc/.test(navigator.vendor) || (navigator.userAgent.indexOf('Safari') !== -1);
    }

    /**
     * Zoom the PDF document to the given zoom value
     *
     * @param  {number} zoomValue - Specifies the Zoom Value for magnify the PDF document
     * @returns void
     */
    public zoomTo(zoomValue: number): void {
        if (zoomValue < 10) {
            zoomValue = 10;
        } else if (zoomValue > 400) {
            zoomValue = 400;
        }
        this.fitType = null;
        this.isNotPredefinedZoom = false;
        if (this.isAutoZoom && this.isInitialLoading) {
            this.pdfViewerBase.onWindowResize();
        } else {
            this.isAutoZoom = false;
            this.onZoomChanged(zoomValue);
        }
        this.isInitialLoading = false;
    }

    /**
     * Magnifies the page to the next value in the zoom drop down list.
     *
     * @returns void
     */
    public zoomIn(): void {
        if (this.fitType || this.isNotPredefinedZoom) {
            this.zoomLevel = this.lowerZoomLevel;
            this.fitType = null;
        }
        this.isNotPredefinedZoom = false;
        if (this.zoomLevel >= 8) {
            this.zoomLevel = 8;
        } else {
            this.zoomLevel++;
        }
        this.isAutoZoom = false;
        this.onZoomChanged(this.zoomPercentages[this.zoomLevel]);
    }

    /**
     * Magnifies the page to the previous value in the zoom drop down list.
     *
     * @returns void
     */
    public zoomOut(): void {
        if (this.fitType || this.isNotPredefinedZoom) {
            this.zoomLevel = this.higherZoomLevel;
            this.fitType = null;
        }
        this.isNotPredefinedZoom = false;
        if (this.zoomLevel <= 0) {
            this.zoomLevel = 0;
        } else {
            this.zoomLevel--;
        }
        this.isAutoZoom = false;
        this.onZoomChanged(this.zoomPercentages[this.zoomLevel]);
    }

    /**
     * Scales the page to fit the page width to the width of the container in the control.
     *
     * @returns void
     */
    public fitToWidth(): void {
        this.isAutoZoom = false;
        const zoomValue: number = this.calculateFitZoomFactor('fitToWidth');
        this.onZoomChanged(zoomValue);
    }

    /**
     * @private
     */
    public fitToAuto(): void {
        this.isAutoZoom = true;
        const zoomValue: number = this.calculateFitZoomFactor('fitToWidth');
        this.onZoomChanged(zoomValue);
    }

    /**
     * Scales the page to fit the page in the container in the control.
     *
     * @param  {number} zoomValue - Defines the Zoom Value for fit the page in the Container
     * @returns void
     */
    public fitToPage(): void {
        const zoomValue: number = this.calculateFitZoomFactor('fitToPage');
        if (zoomValue !== null) {
            this.isAutoZoom = false;
            this.onZoomChanged(zoomValue);
            if (Browser.isDevice && !this.pdfViewer.enableDesktopMode) {
                if (this.isWebkitMobile) {
                    this.pdfViewerBase.viewerContainer.style.overflowY = 'auto';
                } else {
                    this.pdfViewerBase.viewerContainer.style.overflowY = 'hidden';
                }
            } else {
                this.pdfViewerBase.viewerContainer.style.overflowY = 'auto';
            }
            if (this.pdfViewerBase.pageSize[this.pdfViewerBase.currentPageNumber - 1]) {
                // eslint-disable-next-line max-len
                this.pdfViewerBase.viewerContainer.scrollTop = this.pdfViewerBase.pageSize[this.pdfViewerBase.currentPageNumber - 1].top * this.zoomFactor;
            }
        }
    }

    /**
     * Returns zoom factor for the fit zooms.
     *
     * @param type
     */
    private calculateFitZoomFactor(type: string): number {
        let viewerWidth: number = this.pdfViewerBase.viewerContainer.getBoundingClientRect().width;
        let viewerHeight: number = this.pdfViewerBase.viewerContainer.getBoundingClientRect().height;
        if (viewerWidth === 0 && viewerHeight === 0) {
            viewerWidth = parseFloat(this.pdfViewer.width.toString());
            viewerHeight = parseFloat(this.pdfViewer.height.toString());
        }
        if (isNaN(viewerHeight) || isNaN(viewerWidth)) {
            return null;
        }
        this.fitType = type;
        if (this.fitType === 'fitToWidth') {
            let scaleX: number = ((viewerWidth - this.scrollWidth) / this.pdfViewerBase.highestWidth);
            if (this.isAutoZoom) {
                this.fitType = null;
                scaleX = Math.min(1, scaleX);
                if (scaleX === 1) {
                    this.zoomLevel = 2;
                }
            }
            // eslint-disable-next-line radix
            return parseInt((scaleX * 100).toString());
        } else {
            this.isFitToPageMode = true;
            const pageLeft: number = 10;
            const scaleX: number = ((viewerWidth - this.scrollWidth - pageLeft) / this.pdfViewerBase.highestWidth);
            let scaleY: number = (viewerHeight / this.pdfViewerBase.highestHeight);
            if (scaleY > scaleX) {
                scaleY = scaleX;
                this.isFitToPageMode = false;
            }
            // eslint-disable-next-line radix
            return parseInt((scaleY * 100).toString());
        }
    }

    /**
     * Performs pinch in operation
     */
    private pinchIn(): void {
        this.fitType = null;
        let temporaryZoomFactor: number = this.zoomFactor - this.pinchStep;
        if (temporaryZoomFactor < 4 && temporaryZoomFactor > 2) {
            temporaryZoomFactor = this.zoomFactor - this.pinchStep;
        }
        if (temporaryZoomFactor < 0.1) {
            temporaryZoomFactor = 0.1;
        }
        this.isPinchZoomed = true;
        this.onZoomChanged(temporaryZoomFactor * 100);
        this.isTapToFitZoom = true;
        if ((Browser.isDevice && !this.pdfViewer.enableDesktopMode) && (this.zoomFactor * 100) === 50) {
            const zoomValue: number = this.calculateFitZoomFactor('fitToWidth');
            this.fitType = null;
            if (zoomValue <= 50) {
                this.fitToWidth();
            }
        }
    }

    /**
     * Performs pinch out operation
     */
    private pinchOut(): void {
        this.fitType = null;
        let temporaryZoomFactor: number = this.zoomFactor + this.pinchStep;
        if (Browser.isDevice && !this.pdfViewer.enableDesktopMode) {
            if (temporaryZoomFactor > 2) {
                temporaryZoomFactor = 2;
            }
        } else {
            if (temporaryZoomFactor > 2) {
                temporaryZoomFactor = temporaryZoomFactor + this.pinchStep;
            }
            if (temporaryZoomFactor > 4) {
                temporaryZoomFactor = 4;
            }
        }
        this.isTapToFitZoom = true;
        this.isPinchZoomed = true;
        this.onZoomChanged(temporaryZoomFactor * 100);
    }

    /**
     * returns zoom level for the zoom factor.
     *
     * @param zoomFactor
     */
    private getZoomLevel(zoomFactor: number): number {
        let min: number = 0;
        let max: number = this.zoomPercentages.length - 1;
        while ((min <= max) && !(min === 0 && max === 0)) {
            const mid: number = Math.round((min + max) / 2);
            if (this.zoomPercentages[mid] <= zoomFactor) {
                min = mid + 1;
            } else if (this.zoomPercentages[mid] >= zoomFactor) {
                max = mid - 1;
            }
        }
        this.higherZoomLevel = min;
        this.lowerZoomLevel = max;
        return max;
    }
    /**
     * @private
     */
    public checkZoomFactor(): boolean {
        return this.zoomPercentages.indexOf(this.zoomFactor * 100) > -1;
    }

    /**
     * Executes when the zoom or pinch operation is performed
     *
     * @param zoomValue
     */
    private onZoomChanged(zoomValue: number): void {
        if (zoomValue) {
            if (this.pdfViewer.annotationModule) {
                this.pdfViewer.annotationModule.closePopupMenu();
            }
            this.previousZoomFactor = this.zoomFactor;
            this.zoomLevel = this.getZoomLevel(zoomValue);
            this.zoomFactor = this.getZoomFactor(zoomValue);
            if (this.zoomFactor <= 0.25) {
                this.pdfViewerBase.isMinimumZoom = true;
            } else {
                this.pdfViewerBase.isMinimumZoom = false;
            }
            if (Browser.isDevice && !this.pdfViewer.enableDesktopMode) {
                if (this.isWebkitMobile) {
                    this.pdfViewerBase.viewerContainer.style.overflowY = 'auto';
                } else {
                    this.pdfViewerBase.viewerContainer.style.overflowY = 'hidden';
                }
            } else {
                this.pdfViewerBase.viewerContainer.style.overflowY = 'auto';
            }
            if (this.pdfViewerBase.pageCount > 0) {
                if ((this.previousZoomFactor !== this.zoomFactor)) {
                    if (!this.isPinchZoomed) {
                        this.magnifyPages();
                    } else {
                        if (Browser.isDevice && !this.pdfViewer.enableDesktopMode) {
                            // eslint-disable-next-line max-len
                            this.pdfViewerBase.mobilePageNoContainer.style.left = (this.pdfViewer.element.clientWidth / 2) - (parseFloat(this.pdfViewerBase.mobilePageNoContainer.style.width) / 2) + 'px';
                        }
                        this.responsivePages();
                    }
                }
                if (!isBlazor()) {
                    if (this.pdfViewer.toolbarModule) {
                        this.pdfViewer.toolbarModule.updateZoomButtons();
                    }
                }
                if (!this.isInitialLoading) {
                    if (this.previousZoomFactor !== this.zoomFactor) {
                        // eslint-disable-next-line
                        this.pdfViewer.zoomValue = parseInt((this.zoomFactor * 100).toString());
                        this.pdfViewer.fireZoomChange();
                    }
                }
            }
            if (this.pdfViewer.toolbarModule) {
                this.pdfViewer.toolbarModule.updateZoomPercentage(this.zoomFactor);
            }
            if (!this.isInitialLoading) {
                if (this.previousZoomFactor !== this.zoomFactor) {
                    this.pdfViewer.zoomValue = parseInt((this.zoomFactor * 100).toString());
                    this.pdfViewer.fireZoomChange();
                }
            }
            if ((Browser.isDevice && !this.pdfViewer.enableDesktopMode) && this.isPinchZoomed) {
                // eslint-disable-next-line radix
                const zoomPercentage: string = parseInt((this.zoomFactor * 100).toString()) + '%';
                this.pdfViewerBase.navigationPane.createTooltipMobile(zoomPercentage);
            }
        }
    }

    /**
     * @param clientX
     * @param clientY
     * @private
     */
    public setTouchPoints(clientX: number, clientY: number): void {
        this.touchCenterX = clientX;
        this.touchCenterY = clientY;
    }

    /**
     * @param pointX1
     * @param pointY1
     * @param pointX2
     * @param pointY2
     * @param pointX1
     * @param pointY1
     * @param pointX2
     * @param pointY2
     * @param pointX1
     * @param pointY1
     * @param pointX2
     * @param pointY2
     * @param pointX1
     * @param pointY1
     * @param pointX2
     * @param pointY2
     * @private
     */
    public initiatePinchMove(pointX1: number, pointY1: number, pointX2: number, pointY2: number): void {
        this.isPinchScrolled = false;
        this.isMagnified = false;
        this.reRenderPageNumber = this.pdfViewerBase.currentPageNumber;
        this.touchCenterX = (pointX1 + pointX2) / 2;
        this.touchCenterY = (pointY1 + pointY2) / 2;
        this.zoomOverPages(pointX1, pointY1, pointX2, pointY2);
    }

    private magnifyPages(): void {
        this.clearRerenderTimer();
        if (!this.isPagesZoomed) {
            this.reRenderPageNumber = this.pdfViewerBase.currentPageNumber;
        }
        if (!this.pdfViewerBase.documentLoaded && !this.pdfViewerBase.isInitialPageMode) {
            this.isPagesZoomed = true;
        }
        const scrollValue: number = this.getMagnifiedValue(this.pdfViewerBase.viewerContainer.scrollTop);
        if (this.pdfViewer.textSelectionModule) {
            this.pdfViewer.textSelectionModule.maintainSelectionOnZoom(false, true);
        }
        if (this.pdfViewer.formDesignerModule && !this.pdfViewerBase.documentLoaded && !this.pdfViewerBase.isDocumentLoaded) {
            this.isFormFieldPageZoomed = true;
        }
        if (!this.isInitialLoading) {
            this.isMagnified = true;
        }
        this.updatePageLocation();
        this.resizeCanvas(this.reRenderPageNumber);
        if (this.pdfViewer.textSelectionModule) {
            this.pdfViewer.textSelectionModule.resizeTouchElements();
        }
        // eslint-disable-next-line
        let annotModule: any = this.pdfViewer.annotationModule;
        if (annotModule && annotModule.textMarkupAnnotationModule) {
            this.pdfViewer.annotationModule.textMarkupAnnotationModule.updateCurrentResizerPosition();
        }
        if (this.pdfViewerBase.pageSize.length > 0) {
            // eslint-disable-next-line max-len
            this.pdfViewerBase.pageContainer.style.height = this.topValue + this.pdfViewerBase.getPageHeight(this.pdfViewerBase.pageSize.length - 1) + 'px';
            // eslint-disable-next-line
            let proxy: any = this;
            this.pdfViewerBase.renderedPagesList = [];
            this.pdfViewerBase.pinchZoomStorage = [];
            this.pdfViewerBase.viewerContainer.scrollTop = scrollValue;
            if (!this.pdfViewerBase.documentLoaded) {
                this.magnifyPageRerenderTimer = setTimeout(
                    () => {
                        proxy.rerenderMagnifiedPages();
                    }, 800);
            }
        }
    }

    private updatePageLocation(): void {
        this.topValue = 0;
        for (let i: number = 1; i < this.pdfViewerBase.pageSize.length; i++) {
            this.topValue += (this.pdfViewerBase.pageSize[i].height + this.pdfViewerBase.pageGap) * this.zoomFactor;
        }
    }

    private clearRerenderTimer(): void {
        clearTimeout(this.rerenderOnScrollTimer);
        clearTimeout(this.magnifyPageRerenderTimer);
        this.clearIntervalTimer();
        this.isPinchScrolled = false;
    }

    /**
     * @private
     */
    public clearIntervalTimer(): void {
        clearInterval(this.rerenderInterval);
        this.rerenderInterval = null;
        this.clearRendering();
        const oldCanvases: NodeListOf<Element> = document.querySelectorAll('canvas[id*="' + this.pdfViewer.element.id + '_oldCanvas_"]');
        for (let i: number = 0; i < oldCanvases.length; i++) {
            // eslint-disable-next-line
            let pageNumber: number = parseInt(oldCanvases[i].id.split('_oldCanvas_')[1]);
            const pageCanvas: HTMLElement = this.pdfViewerBase.getElement('_pageCanvas_' + pageNumber);
            if (pageCanvas) {
                oldCanvases[i].id = pageCanvas.id;
                pageCanvas.parentElement.removeChild(pageCanvas);
            } else {
                oldCanvases[i].id = this.pdfViewer.element.id + '_pageCanvas_' + pageNumber;
            }
            if (this.pdfViewerBase.isTextMarkupAnnotationModule()) {
                this.pdfViewer.annotationModule.textMarkupAnnotationModule.rerenderAnnotationsPinch(i);
            }
        }
        this.isRerenderCanvasCreated = false;
    }

    /**
     * @param image
     * @private
     */
    public pushImageObjects(image: HTMLImageElement): void {
        if(!isNullOrUndefined(this.imageObjects)) {
            this.imageObjects && this.imageObjects.push(image);
        }
    }

    private clearRendering(): void {
        if (this.imageObjects) {
            for (let j: number = 0; j < this.imageObjects.length; j++) {
                if (this.imageObjects[j]) {
                    this.imageObjects[j].onload = null;
                }
            }
            this.imageObjects = [];
        }
    }

    private rerenderMagnifiedPages(): void {
        if ((this.pdfViewerBase.isInitialLoaded || this.pdfViewerBase.isDocumentLoaded) && !this.pdfViewerBase.isInitialPageMode) {
            this.renderInSeparateThread(this.reRenderPageNumber);
            this.isPagesZoomed = false;
        } else if (this.pdfViewerBase.isInitialPageMode) {
            this.pageRerenderCount = 0;
            this.pdfViewerBase.renderedPagesList = [];
            this.pdfViewerBase.pinchZoomStorage = [];
            this.isMagnified = false;
            this.pdfViewerBase.pageViewScrollChanged(this.reRenderPageNumber);
            this.pdfViewerBase.isInitialPageMode = false;
        }
    }

    private renderInSeparateThread(pageNumber: number): void {
        this.designNewCanvas(pageNumber);
        this.pageRerenderCount = 0;
        this.pdfViewerBase.renderedPagesList = [];
        this.pdfViewerBase.pinchZoomStorage = [];
        this.isMagnified = false;
        this.pdfViewerBase.pageViewScrollChanged(this.reRenderPageNumber);
        // eslint-disable-next-line
        let proxy: any = this;
        this.rerenderInterval = setInterval(
            () => {
                this.initiateRerender(proxy);
            }, 1);
    }


    private responsivePages(): void {
        this.isPagesZoomed = true;
        this.clearRerenderTimer();
        if (this.pdfViewer.textSelectionModule) {
            this.pdfViewer.textSelectionModule.clearTextSelection();
        }
        if (this.pdfViewer.textSearchModule) {
            this.pdfViewer.textSearchModule.clearAllOccurrences();
        }
        const scrollValue: number = this.pdfViewerBase.viewerContainer.scrollTop;
        this.isAutoZoom = false;
        this.updatePageLocation();
        // eslint-disable-next-line max-len
        this.pdfViewerBase.pageContainer.style.height = this.topValue + this.pdfViewerBase.pageSize[this.pdfViewerBase.pageSize.length - 1].height * this.zoomFactor + 'px';
        this.resizeCanvas(this.pdfViewerBase.currentPageNumber);
        if (this.pdfViewerBase.textLayer && this.pdfViewer.formDesignerModule) {
            this.pdfViewerBase.textLayer.clearTextLayers(true);
        }
        if (this.isPinchZoomed) {
            this.calculateScrollValues(scrollValue);
        }
        this.pdfViewerBase.renderedPagesList = [];
        this.pdfViewerBase.pinchZoomStorage = [];
        if (this.pdfViewer.formFieldsModule && !this.pdfViewer.formDesignerModule) {
            let proxy: any = this;
            if (!this.pdfViewerBase.documentLoaded) {
                this.magnifyPageRerenderTimer = setTimeout(
                    () => {
                        proxy.rerenderMagnifiedPages();
                    }, 800);
            }
        }
    }

    private calculateScrollValues(scrollValue: number): void {
        const pageIndex: number = this.pdfViewerBase.currentPageNumber - 1;
        const currentPageCanvas: HTMLElement = this.pdfViewerBase.getElement('_pageDiv_' + pageIndex);
        if (currentPageCanvas) {
            const currentPageBounds: ClientRect = currentPageCanvas.getBoundingClientRect();
            // update scroll top for the viewer container based on pinch zoom factor
            const previousPageTop: number = (currentPageBounds.top) * this.previousZoomFactor;
            const previousY: number = scrollValue + this.touchCenterY;
            // eslint-disable-next-line max-len
            const currentY: number = (currentPageBounds.top) * this.zoomFactor + ((previousY - previousPageTop) < 0 ? previousY - previousPageTop : (previousY -
                // eslint-disable-next-line max-len
                previousPageTop) * (this.zoomFactor / this.previousZoomFactor));
            this.pdfViewerBase.viewerContainer.scrollTop = currentY - this.touchCenterY;
            // update scroll left for the viewer container based on pinch zoom factor
            const prevValue: number = (currentPageBounds.width * this.previousZoomFactor) / currentPageBounds.width;
            const scaleCorrectionFactor: number = this.zoomFactor / prevValue - 1;
            const scrollX: number = this.touchCenterX - currentPageBounds.left;
            this.pdfViewerBase.viewerContainer.scrollLeft += scrollX * scaleCorrectionFactor;
        }
    }

    private rerenderOnScroll(): void {
        this.isPinchZoomed = false;
        if (this.isPinchScrolled) {
            this.rerenderOnScrollTimer = null;
            this.isPinchScrolled = false;
            this.reRenderPageNumber = this.pdfViewerBase.currentPageNumber;
            this.pdfViewerBase.renderedPagesList = [];
            this.pdfViewerBase.pinchZoomStorage = [];
            const pageDivs: NodeList = document.querySelectorAll('img[id*="' + this.pdfViewer.element.id + '_pageCanvas_"]');
            const viewPortWidth: number = 816;
            for (let i: number = 0; i < pageDivs.length; i++) {
                // eslint-disable-next-line radix
                const pageNumber: number = parseInt((pageDivs[i] as HTMLElement).id.split('_pageCanvas_')[1]);
                const pageWidth: number = this.pdfViewerBase.pageSize[pageNumber].width;
                if ((viewPortWidth < pageWidth) && this.pdfViewer.tileRenderingSettings.enableTileRendering) {
                    if (this.pdfViewer.restrictZoomRequest) {
                        (pageDivs[i] as HTMLImageElement).style.width = pageWidth * this.pdfViewerBase.getZoomFactor() + 'px';
                        // eslint-disable-next-line max-len
                        (pageDivs[i] as HTMLImageElement).style.height = this.pdfViewerBase.pageSize[pageNumber].height * this.pdfViewerBase.getZoomFactor() + 'px';
                    } else {
                        (pageDivs[i] as HTMLImageElement).style.width = pageWidth * this.pdfViewerBase.getZoomFactor() + 'px';
                        // eslint-disable-next-line max-len
                        (pageDivs[i] as HTMLImageElement).style.height = this.pdfViewerBase.pageSize[pageNumber].height * this.pdfViewerBase.getZoomFactor() + 'px';
                    }

                }
            }
            if (this.pdfViewerBase.textLayer) {
                const textLayers: NodeList = document.querySelectorAll('div[id*="' + this.pdfViewer.element.id + '_textLayer_"]');
                for (let i: number = 0; i < textLayers.length; i++) {
                    (textLayers[i] as HTMLElement).style.display = 'block';
                }
            }
            if (this.pdfViewerBase.isTextMarkupAnnotationModule()) {
                // eslint-disable-next-line max-len
                const annotationLayers: NodeList = document.querySelectorAll('canvas[id*="' + this.pdfViewer.element.id + '_annotationCanvas_"]');
                for (let j: number = 0; j < annotationLayers.length; j++) {
                    const pageNumber: string = (annotationLayers[j] as HTMLElement).id.split('_annotationCanvas_')[1];
                    // eslint-disable-next-line radix
                    this.pdfViewer.annotationModule.textMarkupAnnotationModule.rerenderAnnotationsPinch(parseInt(pageNumber));
                }
            }
            this.pdfViewerBase.pageViewScrollChanged(this.reRenderPageNumber);
            this.isPagePinchZoomed = false;
            this.rerenderOnScrollTimer = setTimeout(
                () => {
                    this.pdfViewerBase.pageViewScrollChanged(this.reRenderPageNumber);
                }, 300);
        }
    }

    /**
     * @private
     */
    public pinchMoveScroll(): void {
        if (this.isRerenderCanvasCreated) {
            this.clearIntervalTimer();
        }
        if (this.isPagesZoomed || (!this.isRerenderCanvasCreated && this.isPagePinchZoomed)) {
            this.clearRendering();
            this.isPagesZoomed = false;
            clearTimeout(this.magnifyPageRerenderTimer);
            this.isPinchScrolled = true;
            this.isFormFieldPageZoomed = true;
            this.rerenderOnScrollTimer = setTimeout(() => {
                this.rerenderOnScroll();
            }, 100);
        }
    }

    // eslint-disable-next-line
    private initiateRerender(proxy: any): void {
        let isReRender: boolean = false;
        if (this.previousZoomFactor < 0.4 || this.pdfViewerBase.isMinimumZoom) {
            isReRender = true;
        }
        // eslint-disable-next-line max-len
        if (((proxy.pageRerenderCount === proxy.pdfViewerBase.reRenderedCount) || isReRender) && proxy.pageRerenderCount !== 0 && proxy.pdfViewerBase.reRenderedCount !== 0) {
            proxy.reRenderAfterPinch(this.reRenderPageNumber);
            proxy.isFormFieldPageZoomed = false;
        }
    }

    private reRenderAfterPinch(currentPageIndex: number): void {
        this.pageRerenderCount = 0;
        let lowerPageValue: number = currentPageIndex - 3;
        let higherPageValue: number = currentPageIndex + 1;
        if (this.pdfViewerBase.isMinimumZoom) {
            lowerPageValue = currentPageIndex - 4;
            higherPageValue = currentPageIndex + 4;
        }
        lowerPageValue = (lowerPageValue > 0) ? lowerPageValue : 0;
        higherPageValue = (higherPageValue < this.pdfViewerBase.pageCount) ? higherPageValue : (this.pdfViewerBase.pageCount - 1);
        for (let i: number = lowerPageValue; i <= higherPageValue; i++) {
            const pageDiv: HTMLElement = this.pdfViewerBase.getElement('_pageDiv_' + i);
            const pageCanvas: HTMLElement = this.pdfViewerBase.getElement('_pageCanvas_' + i);
            const oldCanvas: HTMLElement = this.pdfViewerBase.getElement('_oldCanvas_' + i);
            if (oldCanvas) {
                oldCanvas.parentNode.removeChild(oldCanvas);
            }
            if (this.pdfViewerBase.isTextMarkupAnnotationModule()) {
                this.pdfViewer.annotationModule.textMarkupAnnotationModule.rerenderAnnotations(i);
            } else if (this.pdfViewer.formDesignerModule) {
                this.rerenderAnnotations(i);
                this.pdfViewer.renderDrawing(undefined, currentPageIndex);
            }
            if (pageDiv) {
                pageDiv.style.visibility = 'visible';
            }
        }
        this.isRerenderCanvasCreated = false;
        this.isPagePinchZoomed = false;
        if (this.pdfViewerBase.reRenderedCount !== 0) {
            this.pdfViewerBase.reRenderedCount = 0;
            this.pageRerenderCount = 0;
            clearInterval(this.rerenderInterval);
            this.rerenderInterval = null;
        }
        this.imageObjects = [];
    }

    /**
     * @param pageNumber
     * @private
     */
    public rerenderAnnotations(pageNumber: number): void {
        // eslint-disable-next-line
        let oldCanvasCollection: any = document.querySelectorAll('#' + this.pdfViewer.element.id + '_old_annotationCanvas_' + pageNumber);
        for (let i: number = 0; i < oldCanvasCollection.length; i++) {
            if (oldCanvasCollection[i]) {
                oldCanvasCollection[i].parentElement.removeChild(oldCanvasCollection[i]);
            }
        }
        const newCanvas: HTMLElement = this.pdfViewerBase.getElement('_annotationCanvas_' + pageNumber);
        if (newCanvas) {
            newCanvas.style.display = 'block';
        }
    }

    private designNewCanvas(currentPageIndex: number): void {
        if (this.pdfViewerBase.textLayer) {
            this.pdfViewerBase.textLayer.clearTextLayers();
        }
        let lowerPageValue: number = currentPageIndex - 3;
        let higherPageValue: number = currentPageIndex + 1; // jshint ignore:line
        if (this.pdfViewerBase.isMinimumZoom) {
            lowerPageValue = currentPageIndex - 4;
            higherPageValue = currentPageIndex + 4;
        }
        lowerPageValue = (lowerPageValue > 0) ? lowerPageValue : 0;
        higherPageValue = (higherPageValue < this.pdfViewerBase.pageCount) ? higherPageValue : (this.pdfViewerBase.pageCount - 1);
        for (let i: number = lowerPageValue; i <= higherPageValue; i++) {
            const canvas: HTMLElement = this.pdfViewerBase.getElement('_pageCanvas_' + i);
            let width: number = this.pdfViewerBase.pageSize[i].width * this.zoomFactor;
            let height: number = this.pdfViewerBase.pageSize[i].height * this.zoomFactor;
            if (canvas && !this.pdfViewer.restrictZoomRequest) {
                // eslint-disable-next-line max-len
                this.pdfViewerBase.renderPageCanvas(this.pdfViewerBase.getElement('_pageDiv_' + i), width, height, i, 'none');
            } else if (!this.pdfViewer.restrictZoomRequest) {
                // eslint-disable-next-line max-len
                this.pdfViewerBase.renderPageCanvas(this.pdfViewerBase.getElement('_pageDiv_' + i), width, height, i, 'none');
            }
        }
        this.isRerenderCanvasCreated = true;
    }

    /**
     * @private
     */
    public pageRerenderOnMouseWheel(): void {
        if (this.isRerenderCanvasCreated) {
            this.clearIntervalTimer();
            clearTimeout(this.magnifyPageRerenderTimer);
            if (!this.isPinchScrolled) {
                this.isPinchScrolled = true;
                this.rerenderOnScrollTimer = setTimeout(() => {
                    this.rerenderOnScroll();
                }, 100);
            }
        }
    }

    /**
     * @private
     */
    public renderCountIncrement(): void {
        if (this.isRerenderCanvasCreated) {
            this.pageRerenderCount++;
        }
    }

    /**
     * @private
     */
    public rerenderCountIncrement(): void {
        if (this.pageRerenderCount > 0) {
            this.pdfViewerBase.reRenderedCount++;
        }
    }

    /**
     * @param pageNumber
     * @private
     */
    public resizeCanvas(pageNumber: number): void {
        let annotationModule : any = this.pdfViewer.annotationModule;
        if (annotationModule && annotationModule.inkAnnotationModule) {
            // eslint-disable-next-line
            let currentPageNumber: number = parseInt(annotationModule.inkAnnotationModule.currentPageNumber);
            annotationModule.inkAnnotationModule.drawInkAnnotation(currentPageNumber);
        }
        if (annotationModule && annotationModule.freeTextAnnotationModule) {
            // eslint-disable-next-line
            let currentPosition: any = { x: annotationModule.freeTextAnnotationModule.currentPosition[0], y: annotationModule.freeTextAnnotationModule.currentPosition[1], width: annotationModule.freeTextAnnotationModule.currentPosition[2], height: annotationModule.freeTextAnnotationModule.currentPosition[3] };
            annotationModule.freeTextAnnotationModule.addInputInZoom(currentPosition);
        }
        let lowerPageValue: number = pageNumber - 3;
        let higherPageValue: number = pageNumber + 3;
        if (this.pdfViewerBase.isMinimumZoom) {
            lowerPageValue = pageNumber - 4;
            higherPageValue = pageNumber + 4;
        }
        lowerPageValue = (lowerPageValue > 0) ? lowerPageValue : 0;
        higherPageValue = (higherPageValue < this.pdfViewerBase.pageCount) ? higherPageValue : (this.pdfViewerBase.pageCount - 1);
        for (let i: number = lowerPageValue; i <= higherPageValue; i++) {
            const pageDiv: HTMLElement = this.pdfViewerBase.getElement('_pageDiv_' + i);
            const textLayer: HTMLElement = document.getElementById(this.pdfViewer.element.id + '_textLayer_' + i);
            if (pageDiv) {
                if ((lowerPageValue <= i) && (i <= higherPageValue)) {
                    let isSelectionAvailable: boolean = false;
                    if (this.pdfViewer.textSelectionModule) {
                        isSelectionAvailable = this.pdfViewer.textSelectionModule.isSelectionAvailableOnScroll(i);
                    }
                    if (this.pdfViewerBase.pageSize[i] != null) {
                        let width: number = this.pdfViewerBase.pageSize[i].width * this.zoomFactor;
                        const height: number = this.pdfViewerBase.pageSize[i].height * this.zoomFactor;
                        pageDiv.style.width = width + 'px';
                        pageDiv.style.height = height + 'px';
                        // eslint-disable-next-line max-len
                        pageDiv.style.top = ((this.pdfViewerBase.pageSize[i].top) * this.zoomFactor) + 'px';
                        if (this.pdfViewer.enableRtl) {
                            pageDiv.style.right = this.pdfViewerBase.updateLeftPosition(i) + 'px';
                        } else {
                            pageDiv.style.left = this.pdfViewerBase.updateLeftPosition(i) + 'px';
                        }
                        const canvas: HTMLElement = this.pdfViewerBase.getElement('_pageCanvas_' + i);
                        if (canvas) {
                            canvas.style.width = (width) + 'px';
                            canvas.style.height = height + 'px';
                            if (this.pdfViewer.annotation) {
                                this.pdfViewer.annotationModule.resizeAnnotations(width, height, i);
                            } else if (this.pdfViewer.formDesignerModule) {
                                this.pdfViewer.formDesignerModule.resizeAnnotations(width, height, i);
                            }
                        }
                        let zoomFactor = this.pdfViewerBase.retrieveCurrentZoomFactor();
                        let tileCount: number = this.pdfViewerBase.getTileCount(this.pdfViewerBase.pageSize[i].width);
                        let noTileX: number;
                        let noTileY: number;
                        noTileX = noTileY = tileCount;
                        const tileSettings: TileRenderingSettingsModel = this.pdfViewer.tileRenderingSettings;
                        if (tileSettings.enableTileRendering && tileSettings.x > 0 && tileSettings.y > 0) {
                            if ((1200 < this.pdfViewerBase.pageSize[i].width || this.pdfViewerBase.getZoomFactor() > 2)) {
                                noTileX = tileSettings.x;
                                noTileY = tileSettings.y;
                            }
                        }
                        let tileRequestCount: number = noTileX * noTileY;
                        if (tileRequestCount === 1) {
                            let storedData: any = this.pdfViewerBase.getWindowSessionStorage(i, zoomFactor) ? this.pdfViewerBase.getWindowSessionStorage(i, zoomFactor) : this.pdfViewerBase.getPinchZoomPage(i);
                            if (storedData) {
                                storedData = JSON.parse(storedData);
                                let imageData: string = storedData['image'];
                                if (imageData) {
                                    (canvas as HTMLImageElement).src = imageData;
                                    canvas.style.display = 'block';
                                    const oldCanvases: NodeListOf<Element> = document.querySelectorAll('img[id*="' + this.pdfViewer.element.id + '_tileimg_' + i + '_"]');
                                    const pageCanvas: HTMLElement = this.pdfViewerBase.getElement('_pageDiv_' + i);
                                    for (let k: number = 0; k < oldCanvases.length; k++) {
                                        let tileImgId: string[] = oldCanvases[k].id.split('_');
                                        if (parseFloat(tileImgId[tileImgId.length - 3]) != this.pdfViewerBase.getZoomFactor())
                                            pageCanvas.removeChild(oldCanvases[k]);
                                    }
                                    const oldPageDiv: NodeListOf<Element> = document.querySelectorAll('img[id*="' + this.pdfViewer.element.id + '_oldCanvas"]');
                                    for (let j: number = 0; j < oldPageDiv.length; j++) {
                                        pageDiv.removeChild(oldPageDiv[j]);
                                    }
                                }
                                this.pdfViewerBase.isReRenderRequired = false;
                            } else {
                                this.pdfViewerBase.isReRenderRequired = true;
                            }
                        } else {
                            const oldCanvases: NodeListOf<Element> = document.querySelectorAll('img[id*="' + this.pdfViewer.element.id + '_tileimg_' + i + '_"]');
                            for (let l: number = 0; l < oldCanvases.length; l++) {
                                let tileImgId: string[] = oldCanvases[l].id.split('_');
                                let tileX: number = parseFloat(tileImgId[tileImgId.length - 2]);
                                let tileY: number = parseFloat(tileImgId[tileImgId.length - 1]);
                                // eslint-disable-next-line
                                let tileData: any = JSON.parse(this.pdfViewerBase.getWindowSessionStorageTile(i, tileX, tileY, zoomFactor));
                                if (tileData && tileData.zoomFactor) {
                                    zoomFactor = tileData.zoomFactor;
                                }
                                if (parseFloat(tileImgId[tileImgId.length - 4]) === i) {
                                    canvas.style.display = 'none';
                                    let node: Node = oldCanvases[l];
                                    // Make sure it's really an Element
                                    if (node.nodeType == Node.ELEMENT_NODE) {
                                        let dataScaleFactor: number = 1.5;
                                        if (!isNullOrUndefined(tileData)) {
                                            dataScaleFactor = (!isNullOrUndefined(tileData.scaleFactor)) ? tileData.scaleFactor : 1.5;
                                        }
                                        let pageWidth:number=this.pdfViewerBase.pageSize[i].width;
                                        let serverImageWidth: number = pageWidth * zoomFactor * dataScaleFactor;
                                        let serverImageHeight: number = this.pdfViewerBase.pageSize[i].height * zoomFactor * dataScaleFactor;
                                        let tilewidth: number = serverImageWidth / noTileX;
                                        let tileHeight: number = serverImageHeight / noTileY;
                                        let originalWidth: number = tilewidth;
                                        let originalLeft: number = parseFloat(tileImgId[tileImgId.length - 2]) * tilewidth;
                                        let originalTop: number = parseFloat(tileImgId[tileImgId.length - 1]) * tileHeight;
                                        (node as any).width =(((originalWidth * this.pdfViewerBase.getZoomFactor()) / zoomFactor) / dataScaleFactor);
                                        (node as any).style.width =(((originalWidth * this.pdfViewerBase.getZoomFactor()) / zoomFactor) / dataScaleFactor) +'px';
                                        (node as HTMLElement).style.left =(((originalLeft * this.pdfViewerBase.getZoomFactor()) / zoomFactor) / dataScaleFactor) + 'px';
                                        (node as HTMLElement).style.top =(((originalTop * this.pdfViewerBase.getZoomFactor()) / zoomFactor) / dataScaleFactor) + 'px';
                                        (node as HTMLElement).id = this.pdfViewer.element.id + '_tileimg_' + i + '_' + this.pdfViewerBase.getZoomFactor() + '_' + tileX + '_' + tileY;
                                        if (tileData) {
                                            let imageData: string = tileData['image'];
                                            if (imageData) {
                                                (node as HTMLImageElement).src = imageData;
                                            }
                                            this.pdfViewerBase.isReRenderRequired = false;
                                        } else {
                                            this.pdfViewerBase.isReRenderRequired = true;
                                        }
                                    }
                                }
                            }
                            if (oldCanvases.length === 0) {
                                this.pdfViewerBase.isReRenderRequired = true;
                            }
                        }
                        const aElement: any = pageDiv.getElementsByTagName('a');
                        if (aElement.length !== 0) {
                            for (let index: number = aElement.length - 1; index >= 0; index--) {
                                aElement[index].parentNode.removeChild(aElement[index]);
                            }
                        }
                        if (textLayer) {
                            textLayer.style.width = width + 'px';
                            textLayer.style.height = height + 'px';
                            if (this.pdfViewer.textSelectionModule) {
                                if (this.isPinchZoomed) {
                                    textLayer.style.display = 'none';
                                } else if (this.isMagnified) {
                                    const lowerValue: number = ((pageNumber - 2) === 0) ? 0 : (pageNumber - 2);
                                    // eslint-disable-next-line max-len
                                    const higherValue: number = ((pageNumber) === (this.pdfViewerBase.pageCount)) ? (this.pdfViewerBase.pageCount - 1) : (pageNumber + 1);
                                    if ((lowerValue <= i) && (i <= higherValue) && ((this.pdfViewer.textSelectionModule.isTextSelection && isSelectionAvailable) || this.pdfViewerBase.textLayer.getTextSearchStatus() || this.pdfViewerBase.isInitialPageMode)) {
                                        this.pdfViewerBase.textLayer.resizeTextContentsOnZoom(i);
                                        if (this.pdfViewer.textSelectionModule.isTextSelection && isSelectionAvailable) {
                                            this.pdfViewer.textSelectionModule.applySelectionRangeOnScroll(i);
                                        }
                                    } else {
                                        textLayer.style.display = 'none';
                                    }
                                } else {
                                    textLayer.style.display = 'none';
                                }
                            }
                            this.pdfViewerBase.applyElementStyles(textLayer, i);
                        }
                        const adornerSvg: HTMLElement = getDiagramElement(this.pdfViewer.element.id + '_textLayer_' + i);
                        if (adornerSvg) {
                            const adonerLayer: HTMLElement = getDiagramElement(this.pdfViewer.element.id + i + '_diagramAdorner_svg');
                            if (adonerLayer) {
                                adonerLayer.style.width = width + 'px';
                                adonerLayer.style.height = height + 'px';
                            }
                            const diagramAdornerLayer: HTMLElement =
                                getDiagramElement(this.pdfViewer.element.id + i + '_diagramAdornerLayer');
                            if (diagramAdornerLayer) {
                                diagramAdornerLayer.style.width = width + 'px';
                                diagramAdornerLayer.style.height = height + 'px';
                            }
                            adornerSvg.style.width = width + 'px';
                            adornerSvg.style.height = height + 'px';
                            this.pdfViewer.renderSelector(i, this.pdfViewer.annotationSelectorSettings);
                            this.pdfViewerBase.applyElementStyles(diagramAdornerLayer, i);
                        }
                    }
                }
            }
        }
    }

    private zoomOverPages(pointX1: number, pointY1: number, pointX2: number, pointY2: number): void {
        // eslint-disable-next-line
        let currentDifference = Math.sqrt(Math.pow((pointX1 - pointX2), 2) + Math.pow((pointY1 - pointY2), 2));
        if (this.previousTouchDifference > -1) {
            if (currentDifference > this.previousTouchDifference) {
                this.pinchOut();
            } else if (currentDifference < this.previousTouchDifference) {
                this.pinchIn();
            }
        }
        this.previousTouchDifference = currentDifference;
    }

    /**
     * @private
     */
    public pinchMoveEnd(): void {
        this.touchCenterX = 0;
        this.touchCenterY = 0;
        this.previousTouchDifference = -1;
        if (this.isPinchZoomed) {
            this.isPinchScrolled = false;
            this.isPagePinchZoomed = true;
            this.pinchMoveScroll();
        }
    }

    /**
     * @param event
     * @private
     */
    // eslint-disable-next-line
    public fitPageScrollMouseWheel(event: WheelEvent): void {
        if (this.fitType === 'fitToPage') {
            this.isMagnified = false;
            event.preventDefault();
            if (event.deltaY > 0) {
                this.downwardScrollFitPage(this.pdfViewerBase.currentPageNumber - 1);
            } else {
                this.upwardScrollFitPage(this.pdfViewerBase.currentPageNumber - 1);
            }
        }
    }

    /**
     * @param event
     * @private
     */
    public magnifyBehaviorKeyDown(event: KeyboardEvent): void {
        const isMac: boolean = navigator.platform.match(/(Mac|iPhone|iPod|iPad)/i) ? true : false;
        const isCommandKey: boolean = isMac ? event.metaKey : false;
        switch (event.keyCode) {
            case 38: // up arrow
            case 37: // left arrow
            case 33: // page up
                if (this.fitType === 'fitToPage' && !((event.ctrlKey || isCommandKey) && event.shiftKey)) {
                    event.preventDefault();
                    this.upwardScrollFitPage(this.pdfViewerBase.currentPageNumber - 1);
                }
                break;
            case 40: // down arrow
            case 39: // right arrow
            case 34: // page down
                if (this.fitType === 'fitToPage' && !((event.ctrlKey || isCommandKey) && event.shiftKey)) {
                    event.preventDefault();
                    this.downwardScrollFitPage(this.pdfViewerBase.currentPageNumber - 1);
                }
                break;
            case 187: // equal key
                if (event.ctrlKey || isCommandKey) {
                    event.preventDefault();
                    this.zoomIn();
                }
                break;
            case 189: // minus key
                if (event.ctrlKey || isCommandKey) {
                    event.preventDefault();
                    this.zoomOut();
                }
                break;
            case 48: // zero key
                if ((event.ctrlKey || isCommandKey) && !event.shiftKey) {
                    event.preventDefault();
                    this.fitToPage();
                }
                break;
            case 49: // one key
                if ((event.ctrlKey || isCommandKey) && !event.shiftKey) {
                    event.preventDefault();
                    this.zoomTo(100);
                }
                break;
            default:
                break;
        }
    }

    private upwardScrollFitPage(currentPageIndex: number): void {
        if (currentPageIndex > 0) {
            this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex - 1)).style.visibility = 'visible';
            this.pdfViewerBase.viewerContainer.scrollTop = this.pdfViewerBase.pageSize[currentPageIndex - 1].top * this.zoomFactor;
            if (this.isFitToPageMode) {
                this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex)).style.visibility = 'hidden';
            }
        }
    }

    /**
     * @param currentPageIndex
     * @private
     */
    public updatePagesForFitPage(currentPageIndex: number): void {
        if (this.fitType === 'fitToPage') {
            if (this.isFitToPageMode) {
                if (currentPageIndex > 0 && this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex - 1))) {
                    this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex - 1)).style.visibility = 'hidden';
                }
                // eslint-disable-next-line max-len
                if ((currentPageIndex < (this.pdfViewerBase.pageCount - 1)) && this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex + 1))) {
                    this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex + 1)).style.visibility = 'hidden';
                }
            }
        }
    }

    /**
     * @private
     */
    public onDoubleTapMagnification(): void {
        if (this.pdfViewer.toolbarModule && isBlazor()) {
            this.pdfViewer.toolbarModule.showToolbar(true);
        }
        const scrollValue: number = this.pdfViewerBase.viewerContainer.scrollTop;
        if (!this.pdfViewer.selectedItems.annotations[0]) {
            if (!this.isTapToFitZoom) {
                if (this.zoomFactor < 2) {
                    this.zoomTo(200);
                } else {
                    this.fitToWidth();
                }
            } else {
                this.fitToWidth();
            }
            this.calculateScrollValues(scrollValue);
            this.isTapToFitZoom = !this.isTapToFitZoom;
        } else {
            if (isBlazor()) {
                // eslint-disable-next-line max-len
                if (this.pdfViewer.selectedItems.annotations[0] && this.pdfViewer.selectedItems.annotations[0].shapeAnnotationType === 'FreeText') {
                    const elmtPosition: PointModel = {};
                    elmtPosition.x = this.pdfViewer.selectedItems.annotations[0].bounds.x;
                    elmtPosition.y = this.pdfViewer.selectedItems.annotations[0].bounds.y;
                    // eslint-disable-next-line max-len
                    this.pdfViewer.annotation.freeTextAnnotationModule.addInuptElemet(elmtPosition, this.pdfViewer.selectedItems.annotations[0]);
                }
            }
        }
    }

    private downwardScrollFitPage(currentPageIndex: number): void {
        if (currentPageIndex !== (this.pdfViewerBase.pageCount - 1)) {
            this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex + 1)).style.visibility = 'visible';
            this.pdfViewerBase.viewerContainer.scrollTop = this.pdfViewerBase.pageSize[currentPageIndex + 1].top * this.zoomFactor;
            if (this.isFitToPageMode) {
                if (currentPageIndex + 1 === (this.pdfViewerBase.pageCount - 1)) {
                    this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex)).style.visibility = 'hidden';
                } else {
                    this.pdfViewerBase.getElement('_pageDiv_' + (currentPageIndex + 2)).style.visibility = 'hidden';
                }
            }
        }
    }

    private getMagnifiedValue(value: number): number {
        return (value / this.previousZoomFactor) * this.zoomFactor;
    }
    /**
     * @private
     */
    public destroy(): void {
        this.imageObjects = undefined;
    }

    /**
     * returns zoom factor when the zoom percent is passed.
     *
     * @param zoomValue
     */
    private getZoomFactor(zoomValue: number): number {
        return zoomValue / 100;
    }
    /**
     * @private
     */
    public getModuleName(): string {
        return 'Magnification';
    }
}
