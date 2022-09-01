import { useState, useMemo } from "react";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CancelIcon from "@mui/icons-material/Cancel";
import Typography from "@mui/material/Typography";
import DataGrid from "components/UI/DataGrid";
import { GridActionsCellItem } from "@mui/x-data-grid";
import { DrawerHeader } from "components/UI/DrawerHeader";
import { useFetchList } from "hooks/useFetchList";
import { getClusterResourceBinding } from "apis/clusterManagement";
import { getResourceBindingSummary } from "utils/generateResponseSummary";
import { useTestFetchList } from "tests/hooks/useTestFetchList";
import TreeViewer from "components/UI/TreeViewer";
import Body from ".";
import { columnTemplate } from "./template";

export default function ResourceBindingMain() {
  let data = {};
  let error = null;
  if (process.env.REACT_APP_STAGE !== "TEST") {
    [data, error] = useFetchList(getClusterResourceBinding);
  } else {
    [data, error] = useTestFetchList(3);
  }
  const rows = useMemo(() => getResourceBindingSummary(data), [data]);
  const [showDetails, setDetails] = useState(null);

  const onExpandDetails = (id) => () => {
    setDetails(id);
  };
  const onRetractDetails = () => () => {
    setDetails(null);
  };

  const columns = useMemo(
    () => [
      ...columnTemplate,
      {
        field: "clusters",
        headerName: "Clusters",
        type: "string",
        width: 250,
        align: "center",
        headerAlign: "center",
        disableColumnMenu: true
      },
      {
        field: "status",
        headerName: "Cluster Status",
        type: "string",
        width: 250,
        align: "center",
        headerAlign: "center",
        disableColumnMenu: true
      },
      {
        field: "actions",
        headerName: "Details",
        type: "actions",
        getActions: (params) => [
          showDetails !== null && showDetails === params.id ? (
            <GridActionsCellItem
              label="Back"
              icon={<CancelIcon />}
              onClick={onRetractDetails(params.id)}
            />
          ) : (
            <GridActionsCellItem
              label="More Info"
              disabled={showDetails !== null}
              icon={<MoreHorizIcon />}
              onClick={onExpandDetails(params.id)}
            />
          )
        ]
      }
    ],
    [showDetails, onExpandDetails, onRetractDetails, rows]
  );

  return (
    <Body>
      <DrawerHeader>
        <Typography gutterBottom variant="h1">
          {"Cluster Resource Bindings"}
        </Typography>
      </DrawerHeader>
      <DataGrid columns={columns} rows={rows} />
      {showDetails !== null ? (
        <TreeViewer data={data?.items[showDetails]} />
      ) : null}
    </Body>
  );
}
