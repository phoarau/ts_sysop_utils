import { Modal } from "bootstrap";
import { Photo } from "../../model/Photo";
import { baseUrl } from "../commonUtils";
import { Fancybox } from "@fancyapps/ui/dist/fancybox/";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import * as filepond from "filepond";
import "filepond/dist/filepond.min.css";
import { getCsrfToken } from "../AuthUtils";
import { DataTableResponse } from "../Types";

type Props = {
    /**
     * ID du container dans lequel afficher la gallerie
     */
    galleryId: string;
    /**
     * Nom de la gallerie. Permet d'éviter de grouper des photos qui n'ont pas lieu d'être groupées
     */
    galleryName?: string;
    /**
     * ID de la modale qui permet d'importer une nouvelle photo
     */
    modalId?: string;
    /**
     * Données supplémentaires qui permettent de filtrer les photos ou alors d'ajouter les bonnes données quand on importe les photos.
     */
    extraData: Record<string, unknown>;
    /**
     * Champ input qui permet d'upload les photos
     */
    inputId?: string;
    /**
     * Fonction exécutée après l'upload d'une nouvelle photo
     * @returns void
     */
    onUpdate?: () => void;
    /**
     * Le texte à afficher quand il n'y a pas d'image à afficher
     *
     * Par défaut chaine de caractère vide
     */
    fallbackTemplate?: string;
};

export class PhotoGalleryController {
    // Controller logic for managing the photo gallery
    private galleryId: string;
    private galleryName?: string;
    private modalId?: string;
    private modal?: Modal;
    private uploader: filepond.FilePond | null;
    private extraData: Record<string, unknown>;
    private inputId?: string;
    private onUpdate?: () => void;
    private fallbackTemplate?: string;

    constructor(props: Props) {
        this.galleryId = props.galleryId;
        this.galleryName = props.galleryName;
        this.modalId = props.modalId;
        this.modal = this.modalId ? Modal.getOrCreateInstance(this.modalId) : undefined;
        this.inputId = props.inputId;
        this.onUpdate = props.onUpdate;
        this.extraData = props.extraData;
        this.fallbackTemplate = props.fallbackTemplate;

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
                // C'est pas tout à fait logique, mais la réponse est faite comme ça
                success: (json: DataTableResponse<Photo>) => {
                    const galeriePhoto = /*html*/ `
                        <div class="d-flex flex-row justify-content-start align-items-start flex-wrap">
                            <div class="rounded rounded-1">
                                ${json.data
                                    .map((photo) => {
                                        return /*html*/ `
                                            <a
                                                data-id="${photo.id}"
                                                data-fancybox="${this.galleryName ?? "gallery"}"
                                                data-src="/${photo.dir}${photo.photo}"
                                                id="${this.galleryName ? `${this.galleryName}-` : ""}photo-${photo.id}"
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

                    $(`${this.galleryId}`).html(json.data.length > 0 ? galeriePhoto : (this.fallbackTemplate ?? ""));

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
