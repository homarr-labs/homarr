interface ResourceBase<TType extends string> {
  type: TType;
  name: string;
  node: string;
  isRunning: boolean;
  status: string;
}

export interface ComputeResourceBase<TType extends string> extends ResourceBase<TType> {
  id: string;
  cpu: {
    utilization: number | null; // previously cpu (0-1)
    cores: number | null; // previously cpuCores
  };
  memory: {
    used: number | null; // previously mem
    total: number | null; // previously maxMem
  };
  storage: {
    used: number | null; // previously disk
    total: number | null; // previously maxDisk
    read: number | null; // previously diskRead
    write: number | null; // previously diskWrite
  };
  network: {
    in: number | null; // previously netIn
    out: number | null; // previously netOut
  };
  uptime: number | null; // expressed in seconds
  haState: string | null; // HA service status (for HA managed VMs).
}

export type NodeResource = ComputeResourceBase<"node">;

export interface LxcResource extends ComputeResourceBase<"lxc"> {
  vmId: number | null;
}

export interface QemuResource extends ComputeResourceBase<"qemu"> {
  vmId: number | null;
}

export interface StorageResource extends ResourceBase<"storage"> {
  id: string;
  storagePlugin: string | null;
  used: number | null; // previously disk
  total: number | null; // previously maxDisk
  isShared: boolean | null; // previously storageShared
}

export type ComputeResource = NodeResource | LxcResource | QemuResource;
export type Resource = ComputeResource | StorageResource;

export interface ProxmoxClusterInfo {
  nodes: NodeResource[];
  lxcs: LxcResource[];
  vms: QemuResource[];
  storages: StorageResource[];
}
