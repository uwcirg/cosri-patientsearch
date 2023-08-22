import useStyles from "../../../styles/patientListStyle";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function Legend() {
  const classes = useStyles();
  const { containNoPMPRow } = usePatientListContext();
  if (containNoPMPRow)
    return (
      <div className={classes.legend}>
        <span className={classes.legendIcon}></span> Not in PMP
      </div>
    );
  return <div className={classes.spacer}></div>;
}
