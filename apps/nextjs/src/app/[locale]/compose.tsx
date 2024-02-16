import React from "react";

type PropsWithChildren = Required<React.PropsWithChildren>;

export const composeWrappers = (
  wrappers: React.FunctionComponent<PropsWithChildren>[],
): React.FunctionComponent<PropsWithChildren> => {
  return wrappers
    .reverse()
    .reduce((Acc, Current): React.FunctionComponent<PropsWithChildren> => {
      // eslint-disable-next-line react/display-name
      return (props) => (
        <Current>
          <Acc {...props} />
        </Current>
      );
    });
};
