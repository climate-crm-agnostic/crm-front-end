import React from "react";
import { Modal } from "../Modal";

export const PipelineModal = ({ isOpen, onClose, title, children }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} showFooter={false} widthClass="sm:w-[600px]">
            {children}
        </Modal>
    );
};
