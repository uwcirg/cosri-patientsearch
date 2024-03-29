import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import { makeStyles } from "@material-ui/core/styles";
import ClearIcon from "@material-ui/icons/Clear";
import Delete from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import SaveIcon from "@material-ui/icons/Save";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Modal from "@material-ui/core/Modal";

const useStyles = makeStyles((theme) => ({
  buttonGroupContainer: {
    marginLeft: theme.spacing(1.5),
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
    display: "inline-block",
  },
  description: {
    marginBottom: theme.spacing(3),
  },
  delYesButton: {
    marginRight: theme.spacing(0.5),
  },
  modalBody: {
    display: "flex",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column"
  },
  modalContent: {
    background: "#FFF",
    padding: theme.spacing(0, 2, 2, 2),
    border: "2px solid #c37707",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column"
  }
}));
// button group: Edit, Update, Delete and Cancel buttons
export default function EditButtonGroup(props) {
  const classes = useStyles();
  const [editMode, setEditMode] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const enableEditMode = () => {
    setEditMode(true);
    if (!props.onEnableEditMode) return;
    props.onEnableEditMode();
  };
  const disableEditMode = () => {
    setEditMode(false);
    if (!props.onDisableEditMode) return;
    props.onDisableEditMode();
  };
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
  };
  const renderButtonGroup = () => (
    <ButtonGroup variant="outlined">
      {editMode && (
        <Button
          size="small"
          color="primary"
          endIcon={<SaveIcon></SaveIcon>}
          disabled={props.isUpdateDisabled}
          onClick={props.handleEditSave}
          variant="contained"
        >
          Update
        </Button>
      )}
      {editMode && (
        <Button
          size="small"
          color="primary"
          endIcon={<ClearIcon></ClearIcon>}
          className="btn-edit-cancel"
          onClick={disableEditMode}
        >
          Cancel
        </Button>
      )}
      {!editMode && (
        <Button
          size="small"
          onClick={enableEditMode}
          endIcon={<EditIcon></EditIcon>}
          color="primary"
        >
          Edit
        </Button>
      )}
      {!editMode && (
        <Button
          size="small"
          color="primary"
          endIcon={<Delete></Delete>}
          onClick={handleDeleteModalOpen}
        >
          Remove
        </Button>
      )}
    </ButtonGroup>
  );
  const renderDeleteDialog = () => (
    <Modal
      open={deleteModalOpen}
      onClose={handleDeleteModalClose}
      aria-labelledby="Delete Entry Modal"
      aria-describedby="Prompt for deleting entry"
    >
      <div className={classes.modalBody}>
        <div className={classes.modalContent}>
          <h3>Are you sure you want to remove this entry?</h3>
          {props.entryDescription && (
            <div
              className={classes.description}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(props.entryDescription),
              }}
            ></div>
          )}
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={handleDelete}
              className={classes.delYesButton}
            >
              Yes
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleDeleteModalClose}
            >
              No
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
  return (
    <div className={classes.buttonGroupContainer}>
      {/* edit/remove button group */}
      {renderButtonGroup()}
      {/* entry removal warning modal */}
      {renderDeleteDialog()}
    </div>
  );
}

EditButtonGroup.propTypes = {
  onEnableEditMode: PropTypes.func,
  onDisableEditMode: PropTypes.func,
  isUpdateDisabled: PropTypes.bool,
  handleEditSave: PropTypes.func,
  handleDelete: PropTypes.func,
  entryDescription: PropTypes.string,
};
