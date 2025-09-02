import { Modal } from "bootstrap";
import { Photo } from "../../model/Photo";
import { baseUrl } from "../commonUtils";
import { Fancybox } from "@fancyapps/ui/dist/fancybox/";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import * as filepond from "filepond";
import "filepond/dist/filepond.min.css";
import { getCsrfToken } from "../AuthUtils";

export class PhotoGalleryController {
    // Controller logic for managing the photo gallery
    galleryId: string;
    modalId?: string;
    modal?: Modal;
    uploader: filepond.FilePond | null;
    extraData: Record<string, unknown>;
    inputId?: string;
    onUpdate?: () => void;

    constructor({
        galleryId,
        modalId,
        extraData,
        inputId,
        onUpdate,
    }: {
        galleryId: string;
        modalId?: string;
        extraData: Record<string, unknown>;
        inputId?: string;
        onUpdate?: () => void;
    }) {
        this.galleryId = galleryId;
        this.modalId = modalId;
        this.modal = this.modalId ? Modal.getOrCreateInstance(this.modalId) : undefined;
        this.inputId = inputId;
        this.onUpdate = onUpdate;
        this.extraData = extraData;

        const fileInputElement = this.inputId ? document.querySelector(this.inputId) : undefined;
        this.uploader = fileInputElement
            ? filepond.create(fileInputElement, {
                  credits: false,
                  instantUpload: true,
                  name: "photo",
                  storeAsFile: true,
                  required: true,
                  allowProcess: false,
                  server: {
                      process: {
                          url: `${baseUrl}photos/add.json`,
                          method: "POST",
                          headers: {
                              "X-CSRF-Token": getCsrfToken(),
                          },
                          onerror: (response) => console.error(response.data),
                          onload: (response) => {
                              const responseObj = JSON.parse(response);
                              if (responseObj.status === 0) {
                                  this.modal?.hide();
                                  this.onUpdate?.();
                              }
                              return 0;
                          },
                          ondata: (formData) => {
                              Object.entries(this.extraData).forEach(([key, value]) => {
                                  const realValue =
                                      typeof value === "string"
                                          ? value
                                          : "toString" in (value as object) &&
                                              typeof (value as object).toString === "function"
                                            ? (value as object).toString()
                                            : "";
                                  formData.append(key, realValue);
                              });
                              return formData;
                          },
                      },
                  },
                  onprocessfiles: () => {
                      this.uploader?.removeFiles();
                  },
              })
            : null;
    }

    build(
        queryParams: Record<string, unknown>,
        options?: {
            /**
             * Taille en pixels de chaque image (valeur par défaut = `80`)
             */
            imageSize?: number;
            /**
             * Si le thumbnail n'arrive pas à charger, indique si on doit afficher l'image complète à la place
             *
             * valeur par défaut: `false`
             */
            useFullImageAsFallback?: boolean;
        },
    ) {
        // Build the photo gallery UI
        const galleryContainer = $(this.galleryId);

        if (galleryContainer) {
            // Initialize the photo gallery
            galleryContainer.empty();
            $.ajax({
                url: `${baseUrl}photos/liste.json`,
                type: "GET",
                cache: false,
                dataType: "json",
                data: queryParams,
                success: (json) => {
                    const galeriePhoto = /*html*/ `
                <div class="d-flex flex-row justify-content-start align-items-start flex-wrap">
                    <div id="incidentPhotoList" class="rounded rounded-1">
                        ${json.data
                            .map((photo: Photo) => {
                                return /*html*/ `
                                    <a
                                        data-id="${photo.id}"
                                        data-fancybox="gallery"
                                        data-src="/${photo.dir}${photo.photo}"
                                        id="bdt-photo-${photo.id}"
                                        data-responsive="${photo.dir}${photo.photo}"
                                        href="/${photo.dir}${photo.photo}">
                                        <img
                                            data-id="${photo.id}"
                                            class="mx-2 my-2"
                                            width="${options?.imageSize ?? 80}px"
                                            height="${options?.imageSize ?? 80}px;"
                                            src="/${photo.dir}thumb.small.${photo.photo}"
                                            ${options?.useFullImageAsFallback ? `onerror="this.onerror=null;this.src='/${photo.dir}${photo.photo}'"` : ""}
                                        >
                                    </a>`;
                            })
                            .join("")}
                    </div>
                </div>`;

                    $(`${this.galleryId}`).html(galeriePhoto);

                    Fancybox.bind("[data-fancybox]", {
                        // Thumbs: {
                        //     type: "modern",
                        // },
                        // Toolbar: {
                        //     items: {
                        //         removephoto: {
                        //             tpl: `<button class="f-button"><i class="fal fa-trash" style='width:24;'></i></button>`,
                        //             click: () => {
                        //                 const photoId: null | string | undefined = Fancybox.getInstance()
                        //                     ?.getSlide()
                        //                     ?.triggerEl?.getAttribute("data-id");
                        //                 if (photoId != null) {
                        //                     // this.photoController.delete(Number(photoId), {
                        //                     //     onSuccess: () => {
                        //                     //         if (this.incident) {
                        //                     //             Fancybox.close();
                        //                     //             this.#drawIncidentFancybox(_containerId);
                        //                     //             this.reloadTables();
                        //                     //         }
                        //                     //     },
                        //                     // });
                        //                 }
                        //             },
                        //         },
                        //     },
                        //     display: {
                        //         left: ["infobar"],
                        //         middle: ["zoomIn", "zoomOut", "toggle1to1", "rotateCCW", "rotateCW", "flipX", "flipY"],
                        //         right: ["removephoto", "thumbs", "download", "slideshow", "close"],
                        //     },
                        // },
                    });
                },
                error(error) {
                    console.error(error);
                },
            });
        }
    }
}
