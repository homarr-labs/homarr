import {CommonChart} from "./common-chart";

export const SystemResourceMemoryChart = () => {
  const data = [
    {
      date: 'Mar 22',
      Usage: 12389,
    },
    {
      date: 'Mar 23',
      Usage: 38932,
    },
    {
      date: 'Mar 24',
      Usage: 25721
    },
    {
      date: 'Mar 25',
      Usage: 1237879
    },
    {
      date: 'Mar 26',
      Usage: 13980
    },
  ];

  return (
    <CommonChart data={data} dataKey={"date"} series={[
      { name: 'Usage', color: 'orange.6' }]} title={"RAM"} />
  )
}