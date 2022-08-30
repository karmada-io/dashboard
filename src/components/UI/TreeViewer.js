import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Box, Stack } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TreeItem from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import { v4 as uuidv4 } from "uuid";

export default function TreeViewer({ data }) {
  const [currentItem, setItem] = useState("");
  const onClickTreeLeaf = (content) => () => {
    setItem(content);
  };
  const generateTreeView = (label, node) => {
    if (Array.isArray(node)) {
      return (
        <TreeItem key={uuidv4()} nodeId={uuidv4()} label={label}>
          {node.map((item, index) =>
            generateTreeView("Array: " + index.toString(), item)
          )}
        </TreeItem>
      );
    } else if (
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "boolean"
    ) {
      return (
        <TreeItem
          nodeId={uuidv4()}
          key={uuidv4()}
          label={label}
          onClick={onClickTreeLeaf(node.toString())}
        />
      );
    } else if (node) {
      return (
        <TreeItem key={uuidv4()} nodeId={uuidv4()} label={label}>
          {Object.entries(node).map(([key, value]) =>
            generateTreeView(key, value)
          )}
        </TreeItem>
      );
    } else {
      return <TreeItem key={uuidv4()} nodeId={uuidv4()} label={label} />;
    }
  };

  const treeView = useMemo(() => generateTreeView("details", data), [data]);

  return (
    <Stack direction="row" sx={{ pt: "10px" }}>
      <Box height="100%" width="40%">
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          sx={{
            height: "100%",
            flexGrow: 1,
            maxWidth: 400,
            overflowY: "auto"
          }}
        >
          {treeView}
        </TreeView>
      </Box>
      <Box
        minHeight="400px"
        height="100%"
        width="60%"
        sx={{
          ml: "35px",
          pl: "15px",
          border: "1px solid rgba(224, 224, 224, 1)"
        }}
      >
        {currentItem}
      </Box>
    </Stack>
  );
}

TreeViewer.propTypes = {
  data: PropTypes.object
};
