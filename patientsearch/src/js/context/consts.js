import { forwardRef } from "react";
import ArrowDownward from "@material-ui/icons/ArrowDownward";
import Check from "@material-ui/icons/Check";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import ClearIcon from "@material-ui/icons/Clear";
import Delete from "@material-ui/icons/Delete";
import Edit from "@material-ui/icons/Edit";
import FirstPage from "@material-ui/icons/FirstPage";
import LastPage from "@material-ui/icons/LastPage";
import Search from "@material-ui/icons/Search";

export const tableIcons = {
    Check: forwardRef((props, ref) => (
      <Check {...props} ref={ref} className="success" />
    )),
    Clear: forwardRef((props, ref) => <ClearIcon {...props} ref={ref} />),
    Filter: forwardRef((props, ref) => (
      <Search {...props} ref={ref} color="primary" />
    )),
    FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
    Edit: forwardRef((props, ref) => <Edit {...props} ref={ref} color="primary"/>),
    LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
    DetailPanel: forwardRef((props, ref) => (
      <div {...props} ref={ref} color="primary" className="detail-panel" />
    )),
    NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
    PreviousPage: forwardRef((props, ref) => (
      <ChevronLeft {...props} ref={ref} />
    )),
    SortArrow: forwardRef((props, ref) => (
      <ArrowDownward {...props} ref={ref} color="primary" />
    )),
    Delete: forwardRef((props, ref) => (
      <Delete {...props} ref={ref} size="small" className="muted">
        Remove
      </Delete>
    )),
};
