import { optionsBuilder } from "../options";

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from((factory) => ({
      embedUrl: factory.text(),
      allowFullScreen: factory.switch(),
      allowScrolling: factory.switch({ defaultValue: true }),
      allowPayment: factory.switch(),
      allowAutoPlay: factory.switch(),
      allowMicrophone: factory.switch(),
      allowCamera: factory.switch(),
      allowGeolocation: factory.switch(),
      allowModals: factory.switch(),
    }));
  },
};
