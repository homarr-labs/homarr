import type {WidgetComponentProps} from "../definition";
import {SystemResourceCPUChart} from "./chart/cpu-chart";
import classes from "./component.module.css";
import {SystemResourceMemoryChart} from "./chart/memory-chart";

export default function SystemResources({options}: WidgetComponentProps<"systemResources">) {
  return (
    <div className={classes.grid}>
      <div className={classes.colSpanWide}>
        <SystemResourceCPUChart/>
      </div>
      <div className={classes.colSpanWide}>
        <SystemResourceMemoryChart/>
      </div>
      <SystemResourceCPUChart/>
      <SystemResourceCPUChart/>
    </div>
  )
}