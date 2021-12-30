import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import ClearIcon from "@material-ui/icons/Clear";
import Delete from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import SaveIcon from "@material-ui/icons/Save";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Modal from "@material-ui/core/Modal";
import theme from "../context/theme";

const useStyles = makeStyles({
    buttonGroupContainer: {
        marginLeft: theme.spacing(1.5),
        marginBottom: theme.spacing(0.5),
        display: "inline-block"
    },
    delYesButton: {
        marginRight: theme.spacing(0.5)
    },
});
export default function EditButtonGroup(props) {
    const classes = useStyles();
    const [editMode, setEditMode] = React.useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const enableEditMode = () => {
        setEditMode(true);
        if (!props.onEnableEditMode) return;
        props.onEnableEditMode();
    }
    const disableEditMode = () => {
        setEditMode(false);
        if (!props.onDisableEditMode) return;
        props.onDisableEditMode();
    }
    const handleDeleteModalOpen = () => {
        setDeleteModalOpen(true);
    };
    const handleDeleteModalClose = () => {
        setDeleteModalOpen(false);
    };
    const handleDelete = () => {
        setDeleteModalOpen(false);
        if (!props.handleDelete) return;
        props.handleDelete();
    }
    return (<div className={classes.buttonGroupContainer}>
        {/* edit/remove button group */}
        <ButtonGroup variant="outlined">
            {/* TODO hook up save event */}
            {editMode && <Button size="small" endIcon={<SaveIcon></SaveIcon>} disabled={props.isUpdateDisabled} onClick={props.handleEditSave}>Update</Button>}
            {editMode && <Button size="small" endIcon={<ClearIcon></ClearIcon>} className="btn-edit-cancel" onClick={disableEditMode}>Cancel</Button>}
            {!editMode &&
                <Button size="small" onClick={enableEditMode} endIcon={<EditIcon></EditIcon>}>Edit</Button>}
            {!editMode && <Button size="small" endIcon={<Delete></Delete>} onClick={handleDeleteModalOpen}>Remove</Button>}
        </ButtonGroup>
        {/* entry removal warning modal */}
        <Modal
            open={deleteModalOpen}
            onClose={handleDeleteModalClose}
            aria-labelledby="Delete Entry Modal"
            aria-describedby="Prompt for deleting entry"
            >
            <div className="warning-modal-body">
                <div className="warning-modal-content">
                    <h3>Are you sure you want to remove this entry?</h3>
                    <div>
                        {/* TODO hook up delete event */}
                        <Button variant="contained" color="primary" onClick={handleDelete} className={classes.delYesButton}>Yes</Button>
                        <Button variant="outlined" color="primary" onClick={handleDeleteModalClose}>No</Button>
                    </div>
                </div>
            </div>
        </Modal>
    </div>);
}

EditButtonGroup.propTypes = {
    onEnableEditMode: PropTypes.func,
    onDisableEditMode: PropTypes.func,
    isUpdateDisabled: PropTypes.bool,
    handleEditSave: PropTypes.func,
    handleDelete: PropTypes.func
};
