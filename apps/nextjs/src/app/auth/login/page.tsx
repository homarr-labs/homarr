import { Card, Center, Stack, Text, Title } from "@homarr/ui";

import { LogoWithTitle } from "~/components/layout/logo";
import { LoginForm } from "./_components/login-form";

export default function Login() {
  return (
    <Center>
      <Stack align="center" mt="xl">
        <LogoWithTitle />
        <Stack gap={6} align="center">
          <Title order={3} fw={400} ta="center">
            Log in to your account
          </Title>
          <Text size="sm" c="gray.5" ta="center">
            Welcome back! Please enter your credentials
          </Text>
        </Stack>
        <Card bg="dark.8" w={64 * 6} maw="90vw">
          <LoginForm />
        </Card>
      </Stack>
    </Center>
  );
}
