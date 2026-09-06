import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { Box } from "@mui/material";

/**
 * DateTimeRangePicker
 *
 * A reusable pair of MUI DateTimePicker inputs for selecting a start and end datetime.
 *
 * Props:
 *   startDateTime  {Dayjs|null}   controlled start value
 *   endDateTime    {Dayjs|null}   controlled end value
 *   onStartChange  {function}     (Dayjs|null) => void
 *   onEndChange    {function}     (Dayjs|null) => void
 *   startLabel     {string}       label for start picker  (default: "Start Date & Time")
 *   endLabel       {string}       label for end picker    (default: "End Date & Time")
 *   disabled       {boolean}      disable both pickers    (default: false)
 *   size           {string}       MUI TextField size      (default: "small")
 *   sx             {object}       extra sx on the wrapper Box
 */
const DateTimeRangePicker = ({
  startDateTime = null,
  endDateTime = null,
  onStartChange,
  onEndChange,
  startLabel = "Start Date & Time",
  endLabel = "End Date & Time",
  disabled = false,
  size = "small",
  format = "DD/MM/YYYY HH:mm",
  sx = {},
}) => {
  const pickerTextFieldSx = (theme) => ({
    "& .MuiPickersInputBase-root, & .MuiPickersOutlinedInput-root": {
      backgroundColor: theme.palette.mode === "dark" ? "#222222" : "#ffffff",
      borderRadius: "10px",
      height: "40px",
    },

    "& .MuiPickersOutlinedInput-notchedOutline": {
      borderColor: theme.palette.mode === "dark" ? "#2e2e2e" : "#e2e8f0",
    },

    "&:hover .MuiPickersOutlinedInput-notchedOutline": {
      borderColor: "#B12B89",
    },

    "& .Mui-focused .MuiPickersOutlinedInput-notchedOutline": {
      borderColor: "#B12B89",
    },

    "& .MuiPickersSectionList-root": {
      padding: "0 4px",
      height: "100%",
      display: "flex",
      alignItems: "center",
    },

    "& .MuiPickersSectionList-section": {
      color: theme.palette.text.primary,
    },
  });
  const handleStartChange = (val) => {
    onStartChange?.(val);
    // auto-clear end if it becomes before new start
    if (val && endDateTime && val.isAfter(endDateTime)) {
      onEndChange?.(null);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1.5,
          ...sx,
        }}
      >
        <DateTimePicker
          label={startLabel}
          value={startDateTime}
          onChange={handleStartChange}
          disabled={disabled}
          format={format}
          slotProps={{
            textField: {
              size,
              variant: "outlined",
              fullWidth: true,
              sx: pickerTextFieldSx,
            },
          }}
        />
        <DateTimePicker
          label={endLabel}
          value={endDateTime}
          onChange={(val) => onEndChange?.(val)}
          disabled={disabled}
          minDateTime={startDateTime ?? undefined}
          format={format}
          slotProps={{
            textField: {
              size,
              variant: "outlined",
              fullWidth: true,
              sx: pickerTextFieldSx,
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default DateTimeRangePicker;