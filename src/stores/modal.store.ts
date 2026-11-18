import { create } from "zustand";

export type ModalButton = {
    label: string;
    onPress?: () => void | Promise<void>;
    variant?: "confirm" | "destructive";
};

export type ShowModalParams = {
    title: string;
    message?: string;
    confirmButton?: ModalButton;
    dismissButton?: ModalButton;
};

type ModalState = {
    visible: boolean;
    title: string;
    message?: string;
    confirmButton?: ModalButton;
    dismissButton?: ModalButton;

    showModal: (params: ShowModalParams) => void;
    hideModal: () => void;
};

export const useModalStore = create<ModalState>((set) => ({
    visible: false,
    title: "",
    message: undefined,
    confirmButton: undefined,
    dismissButton: undefined,

    showModal: ({ title, message, confirmButton, dismissButton }) =>
        set({
            visible: true,
            title,
            message,
            confirmButton,
            dismissButton,
        }),

    hideModal: () =>
        set({
            visible: false,
            title: "",
            message: undefined,
            confirmButton: undefined,
            dismissButton: undefined,
        }),
}));
