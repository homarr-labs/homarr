"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useForm, zodResolver } from "@homarr/form";
import { Button, Group, Stack, TextInput } from "@homarr/ui";
import type { z } from "@homarr/validation";
import { v } from "@homarr/validation";

import { api } from "~/trpc/react";
import { revalidatePathAction } from "../../integrations/new/action";

interface NewServiceFormProps {
  searchParams: {
    name?: string;
    url?: string;
    callbackUrl?: string;
  };
}

export const NewServiceForm = ({ searchParams }: NewServiceFormProps) => {
  const router = useRouter();
  const form = useForm<FormType>({
    initialValues: {
      name: searchParams.name ?? "",
      url: searchParams.url ?? "",
    },
    validate: zodResolver(v.service.create),
  });
  const { mutateAsync, isPending } = api.service.create.useMutation();

  const handleSubmit = async (values: FormType) => {
    const serviceId = await mutateAsync(values);
    const callbackUrl = searchParams.callbackUrl
      ? new URL(searchParams.callbackUrl.replace("%s", serviceId))
      : null;
    if (!callbackUrl) {
      await revalidatePathAction("/services");
      router.push("/services");
      return;
    }

    await revalidatePathAction(callbackUrl.pathname);
    router.push(callbackUrl.toString());
  };

  return (
    <form onSubmit={form.onSubmit((v) => void handleSubmit(v))}>
      <Stack>
        <TextInput label="Name" {...form.getInputProps("name")} />
        <TextInput w="100%" label="Url" {...form.getInputProps("url")} />
        <Group justify="flex-end">
          <Button variant="default" component={Link} href="/services">
            Back to overview
          </Button>
          <Button type="submit" loading={isPending}>
            Create
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = z.infer<typeof v.service.create>;
