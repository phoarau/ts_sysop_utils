import Swal, { SweetAlertIcon } from "sweetalert2";

export type ConfirmProps<T = unknown> = {
    /** Titre de la boîte de dialogue */
    title: string;
    /** Contenu/message de la boîte de dialogue */
    content: string;
    icon: SweetAlertIcon;
    cancelButtonText?: string;
    confirmButtonText: string;
    confirmButtonColor: string;
    /** Fonction à exécuter lors de la confirmation */
    onConfirm: (item: T) => unknown;
};

export function showConfirm<T = unknown>(props: ConfirmProps<T>) {
    return Swal.fire<T>({
        title: props.title,
        text: props.content,
        icon: props.icon,
        showCancelButton: true,
        cancelButtonText: props.cancelButtonText ?? "Annuler",
        confirmButtonText: props.confirmButtonText,
        confirmButtonColor: props.confirmButtonColor,
        showLoaderOnConfirm: true,
        preConfirm: props.onConfirm,
    });
}
