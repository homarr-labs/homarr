import type { inferProcedureOutput } from "@trpc/server";

import { airQualityRouter } from "../router/widgets/air-quality";
import { anchorNotesRouter } from "../router/widgets/anchor-notes";
import { appRouter as appNativeRouter } from "../router/widgets/app";
import { appRouter } from "../router/app";
import { archiveTeamWarriorRouter } from "../router/widgets/archive-team-warrior";
import { assistantRouter } from "../router/assistant";
import { audioStatsRouter } from "../router/widgets/audio-stats";
import { bangsRouter } from "../router/bangs/bangs-router";
import { bazarrRouter } from "../router/widgets/bazarr";
import { beszelRouter } from "../router/widgets/beszel";
import { boardRouter } from "../router/board";
import { calendarRouter } from "../router/widgets/calendar";
import { certificateRouter } from "../router/certificates/certificate-router";
import { clusterRouter } from "../router/kubernetes/router/cluster";
import { configMapsRouter } from "../router/kubernetes/router/configMaps";
import { contextsRouter } from "../router/kubernetes/router/contexts";
import { coolifyRouter } from "../router/widgets/coolify";
import { cronJobsRouter } from "../router/cron-jobs";
import { customApiRouter } from "../router/widgets/custom-api";
import { customWidgetRouter } from "../router/custom-widget/custom-widget-router";
import { dnsHoleRouter } from "../router/widgets/dns-hole";
import { dockerRouter } from "../router/docker/docker-router";
import { downloadsRouter } from "../router/widgets/downloads";
import { firewallRouter } from "../router/widgets/firewall";
import { groupRouter } from "../router/group";
import { healthMonitoringRouter } from "../router/widgets/health-monitoring";
import { homeRouter } from "../router/home";
import { iconsRouter } from "../router/icons";
import { immichRouter } from "../router/widgets/immich";
import { indexerManagerRouter } from "../router/widgets/indexer-manager";
import { ingressesRouter } from "../router/kubernetes/router/ingresses";
import { integrationRouter } from "../router/integration/integration-router";
import { llamacppRouter } from "../router/widgets/llamacpp";
import { locationRouter } from "../router/location";
import { mediaOrganizerRouter } from "../router/widgets/media-organizer";
import { mediaReleaseRouter } from "../router/widgets/media-release";
import { mediaRequestsRouter } from "../router/widgets/media-requests";
import { mediaRouter } from "../router/medias/media-router";
import { mediaServerRouter } from "../router/widgets/media-server";
import { mediaTranscodingRouter } from "../router/widgets/media-transcoding";
import { minecraftRouter } from "../router/widgets/minecraft";
import { namespacesRouter } from "../router/kubernetes/router/namespaces";
import { networkControllerRouter } from "../router/widgets/network-controller";
import { nodesRouter } from "../router/kubernetes/router/nodes";
import { notebookRouter } from "../router/widgets/notebook";
import { notificationsRouter } from "../router/widgets/notifications";
import { optionsRouter } from "../router/widgets/options";
import { paperlessNgxRouter } from "../router/widgets/paperless-ngx";
import { patchmonRouter } from "../router/widgets/patchmon";
import { podsRouter } from "../router/kubernetes/router/pods";
import { releasesRouter } from "../router/widgets/releases";
import { rssFeedRouter } from "../router/widgets/rssFeed";
import { searchEngineRouter } from "../router/search-engine/search-engine-router";
import { secretsRouter } from "../router/kubernetes/router/secrets";
import { sectionRouter } from "../router/section/section-router";
import { serverSettingsRouter } from "../router/serverSettings";
import { servicesRouter } from "../router/kubernetes/router/services";
import { smartHomeRouter } from "../router/widgets/smart-home";
import { speedtestTrackerRouter } from "../router/widgets/speedtest-tracker";
import { statsRouter } from "../router/widgets/stats";
import { stockPriceRouter } from "../router/widgets/stocks";
import { timetableRouter } from "../router/widgets/timetable";
import { tracearrRouter } from "../router/widgets/tracearr";
import { traefikRouter } from "../router/widgets/traefik";
import { umamiRouter } from "../router/widgets/umami";
import { updateCheckerRouter } from "../router/update-checker";
import { upsRouter } from "../router/widgets/ups";
import { uptimeKumaRouter } from "../router/widgets/uptime-kuma";
import { userRouter } from "../router/user";
import { volumesRouter } from "../router/kubernetes/router/volumes";
import { vpnRouter } from "../router/widgets/vpn";
import { wazuhRouter } from "../router/widgets/wazuh";
import { weatherRouter } from "../router/widgets/weather";
import { widgetSecretsRouter } from "../router/widgets/widget-secrets";
import { wudRouter } from "../router/widgets/wud";

import { apiKeysRouter } from "../router/apiKeys";
import { configRouter } from "../router/config/config-router";
import { infoRouter } from "../router/info";
import { inviteRouter } from "../router/invite";

// Eager procedures keep transport registration independent of the lazy UI router.
export const restSources = {
  "apiKeys.create": apiKeysRouter["_def"].record.create,
  "apiKeys.delete": apiKeysRouter["_def"].record.delete,
  "apiKeys.getAll": apiKeysRouter["_def"].record.getAll,
  "app.all": appRouter["_def"].record.all,
  "app.byId": appRouter["_def"].record.byId,
  "app.create": appRouter["_def"].record.create,
  "app.delete": appRouter["_def"].record.delete,
  "app.getPaginated": appRouter["_def"].record.getPaginated,
  "app.search": appRouter["_def"].record.search,
  "app.selectable": appRouter["_def"].record.selectable,
  "app.update": appRouter["_def"].record.update,
  "board.catalog": boardRouter["_def"].record.catalog,
  "board.exists": boardRouter["_def"].record.exists,
  "info.isDemoMode": infoRouter["_def"].record.isDemoMode,
  "info.isDemoReadOnly": infoRouter["_def"].record.isDemoReadOnly,
  "user.completeTour": userRouter["_def"].record.completeTour,
  "user.getTourStatus": userRouter["_def"].record.getTourStatus,
  "user.resetTours": userRouter["_def"].record.resetTours,
  "board.addItem": boardRouter["_def"].record.addItem,
  "board.addSection": boardRouter["_def"].record.addSection,
  "board.changeBoardVisibility": boardRouter["_def"].record.changeBoardVisibility,
  "board.createBoard": boardRouter["_def"].record.createBoard,
  "board.deleteBoard": boardRouter["_def"].record.deleteBoard,
  "board.duplicateBoard": boardRouter["_def"].record.duplicateBoard,
  "board.exportBoard": boardRouter["_def"].record.exportBoard,
  "board.getAllBoards": boardRouter["_def"].record.getAllBoards,
  "board.getBoardById": boardRouter["_def"].record.getBoardById,
  "board.getBoardPermissions": boardRouter["_def"].record.getBoardPermissions,
  "board.getItems": boardRouter["_def"].record.getItems,
  "board.getLayouts": boardRouter["_def"].record.getLayouts,
  "board.getSections": boardRouter["_def"].record.getSections,
  "board.importBoard": boardRouter["_def"].record.importBoard,
  "board.removeItem": boardRouter["_def"].record.removeItem,
  "board.removeSection": boardRouter["_def"].record.removeSection,
  "board.renameBoard": boardRouter["_def"].record.renameBoard,
  "board.saveGroupBoardPermissions": boardRouter["_def"].record.saveGroupBoardPermissions,
  "board.saveLayouts": boardRouter["_def"].record.saveLayouts,
  "board.savePartialBoardSettings": boardRouter["_def"].record.savePartialBoardSettings,
  "board.saveUserBoardPermissions": boardRouter["_def"].record.saveUserBoardPermissions,
  "board.setHomeBoard": boardRouter["_def"].record.setHomeBoard,
  "board.setMobileHomeBoard": boardRouter["_def"].record.setMobileHomeBoard,
  "board.updateItem": boardRouter["_def"].record.updateItem,
  "board.updateItemLayout": boardRouter["_def"].record.updateItemLayout,
  "board.updateSection": boardRouter["_def"].record.updateSection,
  "certificates.ensureRootCertificate": certificateRouter["_def"].record.ensureRootCertificate,
  "certificates.getCertificate": certificateRouter["_def"].record.getCertificate,
  "config.export": configRouter["_def"].record.export,
  "config.import": configRouter["_def"].record.import,
  "group.addMember": groupRouter["_def"].record.addMember,
  "group.createGroup": groupRouter["_def"].record.createGroup,
  "group.deleteGroup": groupRouter["_def"].record.deleteGroup,
  "group.getAll": groupRouter["_def"].record.getAll,
  "group.getById": groupRouter["_def"].record.getById,
  "group.removeMember": groupRouter["_def"].record.removeMember,
  "group.savePermissions": groupRouter["_def"].record.savePermissions,
  "group.updateGroup": groupRouter["_def"].record.updateGroup,
  "info.getInfo": infoRouter["_def"].record.getInfo,
  "integration.all": integrationRouter["_def"].record.all,
  "integration.byId": integrationRouter["_def"].record.byId,
  "integration.create": integrationRouter["_def"].record.create,
  "integration.delete": integrationRouter["_def"].record.delete,
  "integration.getKinds": integrationRouter["_def"].record.getKinds,
  "integration.request": integrationRouter["_def"].record.request,
  "integration.testConnection": integrationRouter["_def"].record.testConnection,
  "integration.update": integrationRouter["_def"].record.update,
  "invite.createInvite": inviteRouter["_def"].record.createInvite,
  "invite.deleteInvite": inviteRouter["_def"].record.deleteInvite,
  "invite.getAll": inviteRouter["_def"].record.getAll,
  "searchEngine.byId": searchEngineRouter["_def"].record.byId,
  "searchEngine.create": searchEngineRouter["_def"].record.create,
  "searchEngine.delete": searchEngineRouter["_def"].record.delete,
  "searchEngine.getPaginated": searchEngineRouter["_def"].record.getPaginated,
  "searchEngine.update": searchEngineRouter["_def"].record.update,
  "serverSettings.getAll": serverSettingsRouter["_def"].record.getAll,
  "serverSettings.getBoardSettings": serverSettingsRouter["_def"].record.getBoardSettings,
  "serverSettings.saveSettings": serverSettingsRouter["_def"].record.saveSettings,
  "serverSettings.updateBoardSettings": serverSettingsRouter["_def"].record.updateBoardSettings,
  "user.changeColorScheme": userRouter["_def"].record.changeColorScheme,
  "user.getPreferences": userRouter["_def"].record.getPreferences,
  "user.updatePreferences": userRouter["_def"].record.updatePreferences,
  "user.changeDdgBangs": userRouter["_def"].record.changeDdgBangs,
  "user.changeDefaultSearchEngine": userRouter["_def"].record.changeDefaultSearchEngine,
  "user.changeEnableRightClickOnWidgets": userRouter["_def"].record.changeEnableRightClickOnWidgets,
  "user.changeFirstDayOfWeek": userRouter["_def"].record.changeFirstDayOfWeek,
  "user.changeHeaderPreferences": userRouter["_def"].record.changeHeaderPreferences,
  "user.changeHomeBoards": userRouter["_def"].record.changeHomeBoards,
  "user.changePassword": userRouter["_def"].record.changePassword,
  "user.changeSearchPreferences": userRouter["_def"].record.changeSearchPreferences,
  "user.create": userRouter["_def"].record.create,
  "user.delete": userRouter["_def"].record.delete,
  "user.editProfile": userRouter["_def"].record.editProfile,
  "user.getAll": userRouter["_def"].record.getAll,
  "user.getById": userRouter["_def"].record.getById,
  "user.search": userRouter["_def"].record.search,
  "user.selectable": userRouter["_def"].record.selectable,
  "user.setProfileImage": userRouter["_def"].record.setProfileImage,
  "app.createMany": appRouter["_def"].record.createMany,
  "assistant.appendMessage": assistantRouter["_def"].record.appendMessage,
  "assistant.clearCredentials": assistantRouter["_def"].record.clearCredentials,
  "assistant.createThread": assistantRouter["_def"].record.createThread,
  "assistant.deleteMessages": assistantRouter["_def"].record.deleteMessages,
  "assistant.deleteThread": assistantRouter["_def"].record.deleteThread,
  "assistant.discoverModels": assistantRouter["_def"].record.discoverModels,
  "assistant.getAdminConfiguration": assistantRouter["_def"].record.getAdminConfiguration,
  "assistant.getAvailability": assistantRouter["_def"].record.getAvailability,
  "assistant.getContextEntities": assistantRouter["_def"].record.getContextEntities,
  "assistant.getGenerationTelemetry": assistantRouter["_def"].record.getGenerationTelemetry,
  "assistant.getModelCapabilities": assistantRouter["_def"].record.getModelCapabilities,
  "assistant.getRuntimeOptions": assistantRouter["_def"].record.getRuntimeOptions,
  "assistant.getThread": assistantRouter["_def"].record.getThread,
  "assistant.listThreads": assistantRouter["_def"].record.listThreads,
  "assistant.renameThread": assistantRouter["_def"].record.renameThread,
  "assistant.submitFeedback": assistantRouter["_def"].record.submitFeedback,
  "assistant.updateConfiguration": assistantRouter["_def"].record.updateConfiguration,
  "assistant.updateConnection": assistantRouter["_def"].record.updateConnection,
  "assistant.updateThreadModel": assistantRouter["_def"].record.updateThreadModel,
  "bangs.search": bangsRouter["_def"].record.search,
  "board.getBoardByName": boardRouter["_def"].record.getBoardByName,
  "board.getBoardSettings": boardRouter["_def"].record.getBoardSettings,
  "board.getHomeBoard": boardRouter["_def"].record.getHomeBoard,
  "board.resetLayout": boardRouter["_def"].record.resetLayout,
  "board.saveBoard": boardRouter["_def"].record.saveBoard,
  "board.search": boardRouter["_def"].record.search,
  "certificates.removeCertificate": certificateRouter["_def"].record.removeCertificate,
  "certificates.removeTrustedHostname": certificateRouter["_def"].record.removeTrustedHostname,
  "certificates.trustHostnameMismatch": certificateRouter["_def"].record.trustHostnameMismatch,
  "cronJobs.disableJob": cronJobsRouter["_def"].record.disableJob,
  "cronJobs.enableJob": cronJobsRouter["_def"].record.enableJob,
  "cronJobs.getJobs": cronJobsRouter["_def"].record.getJobs,
  "cronJobs.startJob": cronJobsRouter["_def"].record.startJob,
  "cronJobs.stopJob": cronJobsRouter["_def"].record.stopJob,
  "cronJobs.triggerJob": cronJobsRouter["_def"].record.triggerJob,
  "cronJobs.updateJobInterval": cronJobsRouter["_def"].record.updateJobInterval,
  "customWidget.available": customWidgetRouter["_def"].record.available,
  "customWidget.configurationRequestUser": customWidgetRouter["_def"].record.configurationRequestUser,
  "customWidget.create": customWidgetRouter["_def"].record.create,
  "customWidget.createFromPreview": customWidgetRouter["_def"].record.createFromPreview,
  "customWidget.delete": customWidgetRouter["_def"].record.delete,
  "customWidget.duplicate": customWidgetRouter["_def"].record.duplicate,
  "customWidget.export": customWidgetRouter["_def"].record.export,
  "customWidget.exportLegacy": customWidgetRouter["_def"].record.exportLegacy,
  "customWidget.findComponents": customWidgetRouter["_def"].record.findComponents,
  "customWidget.get": customWidgetRouter["_def"].record.get,
  "customWidget.getAuthoringPrompt": customWidgetRouter["_def"].record.getAuthoringPrompt,
  "customWidget.getComponent": customWidgetRouter["_def"].record.getComponent,
  "customWidget.getComponentCatalog": customWidgetRouter["_def"].record.getComponentCatalog,
  "customWidget.getComponents": customWidgetRouter["_def"].record.getComponents,
  "customWidget.getExample": customWidgetRouter["_def"].record.getExample,
  "customWidget.getReference": customWidgetRouter["_def"].record.getReference,
  "customWidget.getSharedProps": customWidgetRouter["_def"].record.getSharedProps,
  "customWidget.getSkill": customWidgetRouter["_def"].record.getSkill,
  "customWidget.import": customWidgetRouter["_def"].record.import,
  "customWidget.list": customWidgetRouter["_def"].record.list,
  "customWidget.migrateLegacy": customWidgetRouter["_def"].record.migrateLegacy,
  "customWidget.optionRequest": customWidgetRouter["_def"].record.optionRequest,
  "customWidget.previewAction": customWidgetRouter["_def"].record.previewAction,
  "customWidget.previewCreate": customWidgetRouter["_def"].record.previewCreate,
  "customWidget.previewGet": customWidgetRouter["_def"].record.previewGet,
  "customWidget.previewJournal": customWidgetRouter["_def"].record.previewJournal,
  "customWidget.previewQuery": customWidgetRouter["_def"].record.previewQuery,
  "customWidget.previewRefresh": customWidgetRouter["_def"].record.previewRefresh,
  "customWidget.previewReviseTemplate": customWidgetRouter["_def"].record.previewReviseTemplate,
  "customWidget.readTemplate": customWidgetRouter["_def"].record.readTemplate,
  "customWidget.schema": customWidgetRouter["_def"].record.schema,
  "customWidget.secretClear": customWidgetRouter["_def"].record.secretClear,
  "customWidget.secretSet": customWidgetRouter["_def"].record.secretSet,
  "customWidget.setPreviewLiveActions": customWidgetRouter["_def"].record.setPreviewLiveActions,
  "customWidget.sourceConfigure": customWidgetRouter["_def"].record.sourceConfigure,
  "customWidget.templatePatch": customWidgetRouter["_def"].record.templatePatch,
  "customWidget.toggleEnabled": customWidgetRouter["_def"].record.toggleEnabled,
  "customWidget.update": customWidgetRouter["_def"].record.update,
  "customWidget.updateFromPreview": customWidgetRouter["_def"].record.updateFromPreview,
  "customWidget.validate": customWidgetRouter["_def"].record.validate,
  "customWidget.validateTemplate": customWidgetRouter["_def"].record.validateTemplate,
  "customWidget.workshopGet": customWidgetRouter["_def"].record.workshopGet,
  "customWidget.workshopInstall": customWidgetRouter["_def"].record.workshopInstall,
  "customWidget.workshopSearch": customWidgetRouter["_def"].record.workshopSearch,
  "customWidget.writeTemplate": customWidgetRouter["_def"].record.writeTemplate,
  "docker.getContainers": dockerRouter["_def"].record.getContainers,
  "docker.getEndpoints": dockerRouter["_def"].record.getEndpoints,
  "docker.getServiceHealth": dockerRouter["_def"].record.getServiceHealth,
  "docker.logs": dockerRouter["_def"].record.logs,
  "docker.reconcileServices": dockerRouter["_def"].record.reconcileServices,
  "docker.refreshInventory": dockerRouter["_def"].record.refreshInventory,
  "docker.removeAll": dockerRouter["_def"].record.removeAll,
  "docker.restartAll": dockerRouter["_def"].record.restartAll,
  "docker.startAll": dockerRouter["_def"].record.startAll,
  "docker.stopAll": dockerRouter["_def"].record.stopAll,
  "group.getPaginated": groupRouter["_def"].record.getPaginated,
  "group.savePartialSettings": groupRouter["_def"].record.savePartialSettings,
  "group.savePositions": groupRouter["_def"].record.savePositions,
  "group.selectable": groupRouter["_def"].record.selectable,
  "group.transferOwnership": groupRouter["_def"].record.transferOwnership,
  "home.getStats": homeRouter["_def"].record.getStats,
  "icon.findIcons": iconsRouter["_def"].record.findIcons,
  "integration.getIntegrationPermissions": integrationRouter["_def"].record.getIntegrationPermissions,
  "integration.getMediaRequestOptions": integrationRouter["_def"].record.getMediaRequestOptions,
  "integration.mediaRequestSearchTargets": integrationRouter["_def"].record.mediaRequestSearchTargets,
  "integration.requestMedia": integrationRouter["_def"].record.requestMedia,
  "integration.saveGroupIntegrationPermissions": integrationRouter["_def"].record.saveGroupIntegrationPermissions,
  "integration.saveUserIntegrationPermissions": integrationRouter["_def"].record.saveUserIntegrationPermissions,
  "integration.search": integrationRouter["_def"].record.search,
  "integration.searchInIntegration": integrationRouter["_def"].record.searchInIntegration,
  "integration.searchMediaRequests": integrationRouter["_def"].record.searchMediaRequests,
  "kubernetes.cluster.getCluster": clusterRouter["_def"].record.getCluster,
  "kubernetes.cluster.getClusterResourceCounts": clusterRouter["_def"].record.getClusterResourceCounts,
  "kubernetes.configMaps.getConfigMaps": configMapsRouter["_def"].record.getConfigMaps,
  "kubernetes.contexts.getContexts": contextsRouter["_def"].record.getContexts,
  "kubernetes.ingresses.getIngresses": ingressesRouter["_def"].record.getIngresses,
  "kubernetes.namespaces.getNamespaces": namespacesRouter["_def"].record.getNamespaces,
  "kubernetes.nodes.getNodes": nodesRouter["_def"].record.getNodes,
  "kubernetes.pods.getPods": podsRouter["_def"].record.getPods,
  "kubernetes.secrets.getSecrets": secretsRouter["_def"].record.getSecrets,
  "kubernetes.services.getServices": servicesRouter["_def"].record.getServices,
  "kubernetes.volumes.getVolumes": volumesRouter["_def"].record.getVolumes,
  "location.searchCity": locationRouter["_def"].record.searchCity,
  "media.deleteMedia": mediaRouter["_def"].record.deleteMedia,
  "media.getPaginated": mediaRouter["_def"].record.getPaginated,
  "searchEngine.getDefaultSearchEngine": searchEngineRouter["_def"].record.getDefaultSearchEngine,
  "searchEngine.search": searchEngineRouter["_def"].record.search,
  "section.changeCollapsed": sectionRouter["_def"].record.changeCollapsed,
  "serverSettings.getBranding": serverSettingsRouter["_def"].record.getBranding,
  "serverSettings.getCulture": serverSettingsRouter["_def"].record.getCulture,
  "updateChecker.getAvailableUpdates": updateCheckerRouter["_def"].record.getAvailableUpdates,
  "user.changeByteUnitSystem": userRouter["_def"].record.changeByteUnitSystem,
  "user.changePingIconsEnabled": userRouter["_def"].record.changePingIconsEnabled,
  "widget.airQuality.atLocation": airQualityRouter["_def"].record.atLocation,
  "widget.anchorNotes.getNote": anchorNotesRouter["_def"].record.getNote,
  "widget.anchorNotes.listNotes": anchorNotesRouter["_def"].record.listNotes,
  "widget.anchorNotes.updateNote": anchorNotesRouter["_def"].record.updateNote,
  "widget.app.ping": appNativeRouter["_def"].record.ping,
  "widget.archiveTeamWarrior.getStatus": archiveTeamWarriorRouter["_def"].record.getStatus,
  "widget.audioStats.getStats": audioStatsRouter["_def"].record.getStats,
  "widget.bazarr.getBadges": bazarrRouter["_def"].record.getBadges,
  "widget.beszel.getAlerts": beszelRouter["_def"].record.getAlerts,
  "widget.beszel.getSystemStats": beszelRouter["_def"].record.getSystemStats,
  "widget.beszel.getSystems": beszelRouter["_def"].record.getSystems,
  "widget.calendar.findAllEvents": calendarRouter["_def"].record.findAllEvents,
  "widget.coolify.getInstancesInfo": coolifyRouter["_def"].record.getInstancesInfo,
  "widget.customApi.executeAction": customApiRouter["_def"].record.executeAction,
  "widget.customApi.getData": customApiRouter["_def"].record.getData,
  "widget.customApi.queryRequest": customApiRouter["_def"].record.queryRequest,
  "widget.customApi.refresh": customApiRouter["_def"].record.refresh,
  "widget.dnsHole.disable": dnsHoleRouter["_def"].record.disable,
  "widget.dnsHole.enable": dnsHoleRouter["_def"].record.enable,
  "widget.dnsHole.summary": dnsHoleRouter["_def"].record.summary,
  "widget.downloads.deleteItem": downloadsRouter["_def"].record.deleteItem,
  "widget.downloads.getJobsAndStatuses": downloadsRouter["_def"].record.getJobsAndStatuses,
  "widget.downloads.pause": downloadsRouter["_def"].record.pause,
  "widget.downloads.pauseItem": downloadsRouter["_def"].record.pauseItem,
  "widget.downloads.resume": downloadsRouter["_def"].record.resume,
  "widget.downloads.resumeItem": downloadsRouter["_def"].record.resumeItem,
  "widget.firewall.getFirewallCpuStatus": firewallRouter["_def"].record.getFirewallCpuStatus,
  "widget.firewall.getFirewallInterfacesStatus": firewallRouter["_def"].record.getFirewallInterfacesStatus,
  "widget.firewall.getFirewallMemoryStatus": firewallRouter["_def"].record.getFirewallMemoryStatus,
  "widget.firewall.getFirewallVersionStatus": firewallRouter["_def"].record.getFirewallVersionStatus,
  "widget.healthMonitoring.getClusterHealthStatus": healthMonitoringRouter["_def"].record.getClusterHealthStatus,
  "widget.healthMonitoring.getSystemHealthStatus": healthMonitoringRouter["_def"].record.getSystemHealthStatus,
  "widget.healthMonitoring.listStorageVolumes": healthMonitoringRouter["_def"].record.listStorageVolumes,
  "widget.immich.getAlbum": immichRouter["_def"].record.getAlbum,
  "widget.immich.getAlbumPreview": immichRouter["_def"].record.getAlbumPreview,
  "widget.immich.getAlbums": immichRouter["_def"].record.getAlbums,
  "widget.immich.getServerStats": immichRouter["_def"].record.getServerStats,
  "widget.indexerManager.getIndexersStatus": indexerManagerRouter["_def"].record.getIndexersStatus,
  "widget.indexerManager.testAllIndexers": indexerManagerRouter["_def"].record.testAllIndexers,
  "widget.llamacpp.getStats": llamacppRouter["_def"].record.getStats,
  "widget.mediaOrganizer.getData": mediaOrganizerRouter["_def"].record.getData,
  "widget.mediaRelease.getMediaReleases": mediaReleaseRouter["_def"].record.getMediaReleases,
  "widget.mediaRequests.answerRequest": mediaRequestsRouter["_def"].record.answerRequest,
  "widget.mediaRequests.getLatestRequests": mediaRequestsRouter["_def"].record.getLatestRequests,
  "widget.mediaRequests.getStats": mediaRequestsRouter["_def"].record.getStats,
  "widget.mediaServer.getCurrentStreams": mediaServerRouter["_def"].record.getCurrentStreams,
  "widget.mediaTranscoding.getDataAsync": mediaTranscodingRouter["_def"].record.getDataAsync,
  "widget.minecraft.getServerStatus": minecraftRouter["_def"].record.getServerStatus,
  "widget.networkController.summary": networkControllerRouter["_def"].record.summary,
  "widget.notebook.updateContent": notebookRouter["_def"].record.updateContent,
  "widget.notifications.deleteNotification": notificationsRouter["_def"].record.deleteNotification,
  "widget.notifications.getNotifications": notificationsRouter["_def"].record.getNotifications,
  "widget.options.getWidgetOptionSettings": optionsRouter["_def"].record.getWidgetOptionSettings,
  "widget.options.saveItemOptions": optionsRouter["_def"].record.saveItemOptions,
  "widget.paperlessNgx.getStats": paperlessNgxRouter["_def"].record.getStats,
  "widget.patchmon.getStats": patchmonRouter["_def"].record.getStats,
  "widget.releases.getLatest": releasesRouter["_def"].record.getLatest,
  "widget.rssFeed.getFeeds": rssFeedRouter["_def"].record.getFeeds,
  "widget.secrets.deleteSecret": widgetSecretsRouter["_def"].record.deleteSecret,
  "widget.secrets.getConfiguredKinds": widgetSecretsRouter["_def"].record.getConfiguredKinds,
  "widget.secrets.setSecret": widgetSecretsRouter["_def"].record.setSecret,
  "widget.smartHome.entityDetails": smartHomeRouter["_def"].record.entityDetails,
  "widget.smartHome.entityState": smartHomeRouter["_def"].record.entityState,
  "widget.smartHome.executeAutomation": smartHomeRouter["_def"].record.executeAutomation,
  "widget.smartHome.switchEntity": smartHomeRouter["_def"].record.switchEntity,
  "widget.speedtestTracker.getDashboard": speedtestTrackerRouter["_def"].record.getDashboard,
  "widget.stats.catalog": statsRouter["_def"].record.catalog,
  "widget.stats.refresh": statsRouter["_def"].record.refresh,
  "widget.stats.snapshot": statsRouter["_def"].record.snapshot,
  "widget.stockPrice.getPriceHistory": stockPriceRouter["_def"].record.getPriceHistory,
  "widget.timetable.getTimetable": timetableRouter["_def"].record.getTimetable,
  "widget.timetable.searchStations": timetableRouter["_def"].record.searchStations,
  "widget.tracearr.getDashboard": tracearrRouter["_def"].record.getDashboard,
  "widget.traefik.getDashboard": traefikRouter["_def"].record.getDashboard,
  "widget.umami.getActiveVisitors": umamiRouter["_def"].record.getActiveVisitors,
  "widget.umami.getEventNames": umamiRouter["_def"].record.getEventNames,
  "widget.umami.getMultiEventTimeSeries": umamiRouter["_def"].record.getMultiEventTimeSeries,
  "widget.umami.getTopPages": umamiRouter["_def"].record.getTopPages,
  "widget.umami.getTopReferrers": umamiRouter["_def"].record.getTopReferrers,
  "widget.umami.getVisitorStats": umamiRouter["_def"].record.getVisitorStats,
  "widget.umami.getWebsites": umamiRouter["_def"].record.getWebsites,
  "widget.ups.getSummaries": upsRouter["_def"].record.getSummaries,
  "widget.uptimeKuma.getDashboard": uptimeKumaRouter["_def"].record.getDashboard,
  "widget.vpn.getSummaries": vpnRouter["_def"].record.getSummaries,
  "widget.wazuh.getAgents": wazuhRouter["_def"].record.getAgents,
  "widget.wazuh.getAlerts": wazuhRouter["_def"].record.getAlerts,
  "widget.wazuh.getAuthFailures": wazuhRouter["_def"].record.getAuthFailures,
  "widget.wazuh.getFim": wazuhRouter["_def"].record.getFim,
  "widget.wazuh.getSummary": wazuhRouter["_def"].record.getSummary,
  "widget.wazuh.getTimeline": wazuhRouter["_def"].record.getTimeline,
  "widget.wazuh.getTopList": wazuhRouter["_def"].record.getTopList,
  "widget.wazuh.getVulnerabilities": wazuhRouter["_def"].record.getVulnerabilities,
  "widget.weather.atLocation": weatherRouter["_def"].record.atLocation,
  "widget.wud.getStats": wudRouter["_def"].record.getStats,
} as const;

export type RestOutputs = {
  [TKey in keyof typeof restSources]: inferProcedureOutput<(typeof restSources)[TKey]>;
};
