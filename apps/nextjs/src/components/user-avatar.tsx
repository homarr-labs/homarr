import { auth } from "@homarr/auth";
import type { AvatarProps, MantineSize } from "@homarr/ui";
import { Avatar } from "@homarr/ui";

interface UserAvatarProps {
  size: MantineSize;
}

export const UserAvatar = async ({ size }: UserAvatarProps) => {
  const currentSession = await auth();

  const commonProps = {
    size,
    color: "primaryColor",
  } satisfies Partial<AvatarProps>;

  if (!currentSession?.user) return <Avatar {...commonProps} />;
  if (currentSession.user.image)
    return (
      <Avatar
        {...commonProps}
        src={currentSession.user.image}
        alt={currentSession.user.name!}
      />
    );

  return (
    <Avatar {...commonProps}>
      {currentSession.user.name!.substring(0, 2).toUpperCase()}
    </Avatar>
  );
};
