import { useState, useMemo } from "react";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CancelIcon from "@mui/icons-material/Cancel";
import Typography from "@mui/material/Typography";
import DataGrid from "components/UI/DataGrid";
import { GridActionsCellItem } from "@mui/x-data-grid";
import { DrawerHeader } from "components/UI/DrawerHeader";
import { useFetchList } from "hooks/useFetchList";
import { getWorks } from "apis/clusterManagement";
import { getWorkSummary } from "utils/generateResponseSummary";
import { useTestFetchList } from "tests/hooks/useTestFetchList";
import TreeViewer from "components/UI/TreeViewer";
import Body from ".";

export default function WorkMain() {
  let data = {};
  let error = null;
  if (process.env.REACT_APP_STAGE !== "TEST") {
    [data, error] = useFetchList(getWorks);
  } else {
    [data, error] = useTestFetchList(2);
  }
  const rows = useMemo(() => getWorkSummary(data), [data]);
  const [showDetails, setDetails] = useState(null);

  const onExpandDetails = (id) => () => {
    setDetails(id);
  };
  const onRetractDetails = () => () => {
    setDetails(null);
  };

  const columns = useMemo(
    () => [
      { field: "id", hide: true, type: "number" },
      {
        field: "name",
        headerName: "Name",
        type: "string",
        width: 200,
        align: "center",
        headerAlign: "center",
        disableColumnMenu: true
      },
      {
        field: "uid",
        headerName: "UID",
        type: "string",
        width: 200,
        align: "center",
        headerAlign: "center",
        disableColumnMenu: true
      },
      {
        field: "namespace",
        headerName: "Namespace",
        type: "string",
        width: 200,
        align: "center",
        headerAlign: "center",
        disableColumnMenu: true
      },
      {
        field: "conditions",
        headerName: "# of Conditions",
        type: "number",
        width: 150,
        align: "center",
        headerAlign: "center",
        disableColumnMenu: true
      },
      {
        field: "manifests",
        headerName: "Target Cluster",
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
          {"Works"}
        </Typography>
      </DrawerHeader>
      <DataGrid columns={columns} rows={rows} />
      {showDetails !== null ? (
        <TreeViewer data={data?.items[showDetails]} />
      ) : null}
    </Body>
  );
}
