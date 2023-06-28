import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { ask, message } from "@tauri-apps/api/dialog";
import { appWindow, PhysicalSize } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/api/notification";
import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
  exists,
} from "@tauri-apps/api/fs";
import {
  IconButton,
  Tooltip,
  Card,
  Grid,
  Divider,
  Chip,
  Typography,
  TextField,
} from "@mui/material";
import moment from "moment";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import CircleIcon from "@mui/icons-material/Circle";

const colorList = ["#D5D8DC", "#AED6F1", "#ABEBC6", "#D7BDE2", "#FCF3CF"];
const savedFileName = "Notes.json";
const savedFilePath = BaseDirectory.AppData;

function App() {
  const [isAddItem, setIsAddItem] = useState();
  const [itemList, setItemList] = useState([]);

  useEffect(() => {
    (async () => {
      await appWindow.setSize(new PhysicalSize(375, 375));
      await appWindow.setMinSize(new PhysicalSize(375, 375));
      if (!(await exists(savedFileName, { dir: savedFilePath })))
        await writeTextFile(savedFileName, "[]", { dir: savedFilePath });
      getList();
      setInterval(() => {
        getList();
      }, 60000);
    })();
  }, []);

  const getList = async () =>
    setItemList(
      JSON.parse(await readTextFile(savedFileName, { dir: savedFilePath }))
    );

  const updateList = async (newList) => {
    await writeTextFile(savedFileName, JSON.stringify(newList), {
      dir: savedFilePath,
    });
    getList();
  };

  const ItemDetails = (props) => {
    const [isEdit, setIsEdit] = useState(false);
    const itemID = props.detail?.id ?? crypto.randomUUID();
    const [itemColor, setItemColor] = useState(
      props.detail?.color ?? colorList[0]
    );
    const [itemTitle, setItemTitle] = useState(props.detail?.title ?? "");
    const [itemContent, setItemContent] = useState(props.detail?.content ?? "");
    const [itemDateTime, setItemDateTime] = useState(
      props.detail?.dateTime ?? ""
    );
    const chipColor = moment(itemDateTime).fromNow().includes("ago")
      ? "warning"
      : "success";

    // Notification reminder
    if (
      props.detail?.dateTime &&
      moment(props.detail?.dateTime).fromNow() == "in 10 minutes"
    ) {
      (async () => {
        sendNotification({
          title: "Reminder StickyNotes",
          body: `The event will start in 10 minutes.\n\n${itemTitle}`,
        });
      })();
    }

    const onDelete = async () => {
      if (props.isAdd) return setIsAddItem();
      if (
        await ask("Are you sure want to delete?", {
          title: "Warning",
          type: "warning",
        })
      )
        updateList(itemList.filter((item) => item.id != itemID));
    };

    const onSave = async () => {
      if (itemDateTime == "" || itemTitle.trim().length == 0)
        return await message("Invalid DateTime and Title !!", {
          title: "Error",
          type: "error",
        });
      if (props.isAdd) setIsAddItem();
      let newList = itemList.filter((item) => item.id != itemID);
      newList.push({
        id: itemID,
        color: itemColor,
        title: itemTitle,
        content: itemContent,
        dateTime: itemDateTime,
      });
      newList.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
      updateList(newList);
    };

    return (
      <Grid item xs={12} sm={3}>
        <Card
          style={{ backgroundColor: itemColor, margin: "1vh", padding: "3vh" }}
        >
          {isEdit || props.isAdd ? (
            <>
              <Grid container>
                <Grid item xs>
                  {colorList.map((item) => (
                    <IconButton
                      key={item}
                      size="small"
                      onClick={() => setItemColor(item)}
                    >
                      <CircleIcon style={{ color: item }} />
                    </IconButton>
                  ))}
                </Grid>
                <Grid item xs={4}>
                  <Tooltip title="Save" style={{ float: "right" }}>
                    <IconButton size="small" onClick={onSave}>
                      <SaveIcon color="success" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete" style={{ float: "right" }}>
                    <IconButton size="small" onClick={onDelete}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
              <Divider style={{ marginTop: "2vh", marginBottom: "2vh" }} />
              <TextField
                variant="standard"
                type="datetime-local"
                fullWidth
                value={itemDateTime}
                onChange={(e) => setItemDateTime(e.target.value)}
              />
              <TextField
                label="Title"
                variant="standard"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                fullWidth
              />
              <TextField
                label="Content"
                variant="standard"
                value={itemContent}
                onChange={(e) => setItemContent(e.target.value)}
                multiline
                fullWidth
              />
            </>
          ) : (
            <>
              <Chip
                label={`${moment(itemDateTime).calendar()} | ${moment(
                  itemDateTime
                ).fromNow()}`}
                color={chipColor}
                style={{ borderRadius: 5 }}
              />
              <Tooltip title="Edit" style={{ float: "right" }}>
                <IconButton size="small" onClick={() => setIsEdit(true)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Typography
                variant="subtitle1"
                style={{ marginTop: "2vh", marginBottom: "1vh" }}
              >
                {itemTitle}
              </Typography>
              <span style={{ whiteSpace: "pre-wrap" }}>{itemContent}</span>
            </>
          )}
        </Card>
      </Grid>
    );
  };
  return (
    <div className="container" style={{ backgroundColor: "#2f2f2f" }}>
      <Tooltip title="Add Reminder">
        <IconButton
          onClick={() =>
            setIsAddItem(!isAddItem ? <ItemDetails isAdd={true} /> : undefined)
          }
        >
          <AddCircleOutlineIcon color="info" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Mini Mode" style={{ float: "right" }}>
        <IconButton
          onClick={async () =>
            await appWindow.setSize(new PhysicalSize(375, 375))
          }
        >
          <CloseFullscreenIcon color="info" />
        </IconButton>
      </Tooltip>
      <Grid container>
        {isAddItem}
        {itemList.map((item, index) => (
          <ItemDetails key={item.id} detail={item} />
        ))}
      </Grid>
    </div>
  );
}

export default App;
