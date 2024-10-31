import "dayjs/locale/ja";

import dayjs from "dayjs";
import { MRT_Localization_JA } from "mantine-react-table/locales/ja/index.esm.mjs";

dayjs.locale("ja");

export default {
  user: {
    title: "ユーザー",
    name: "ユーザー",
    field: {
      email: {
        label: "Eメール",
      },
      username: {
        label: "ユーザー名",
      },
      password: {
        label: "パスワード",
        requirement: {
          lowercase: "小文字を含む",
          uppercase: "大文字を含む",
          number: "番号を含む",
        },
      },
      passwordConfirm: {
        label: "パスワードの確認",
      },
    },
    action: {
      login: {
        label: "ログイン",
      },
      register: {
        label: "アカウント作成",
        notification: {
          success: {
            title: "アカウント作成",
          },
        },
      },
      create: "ユーザー作成",
    },
  },
  group: {
    field: {
      name: "名称",
    },
    permission: {
      admin: {
        title: "管理者",
      },
      board: {
        title: "ボード",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "アプリ",
      },
    },
    field: {
      name: {
        label: "名称",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "名称",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "無効なURL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "ユーザー名",
        },
        password: {
          label: "パスワード",
          newLabel: "新しいパスワード",
        },
      },
    },
  },
  media: {
    field: {
      name: "名称",
      size: "サイズ",
      creator: "クリエイター",
    },
  },
  common: {
    direction: "ltr",
    error: "エラー",
    action: {
      add: "追加",
      apply: "適用する",
      create: "作成",
      edit: "編集",
      insert: "挿入",
      remove: "削除",
      save: "保存",
      saveChanges: "変更を保存する",
      cancel: "キャンセル",
      delete: "削除",
      confirm: "確認",
      previous: "前へ",
      next: "次のページ",
      tryAgain: "リトライ",
    },
    information: {
      hours: "時間",
      minutes: "分",
    },
    userAvatar: {
      menu: {
        preferences: "あなたの好み",
        login: "ログイン",
      },
    },
    dangerZone: "危険な操作",
    noResults: "結果が見つかりません",
    zod: {
      errors: {
        default: "このフィールドは無効です。",
        required: "このフィールドは必須です",
      },
    },
    mantineReactTable: MRT_Localization_JA as Readonly<Record<keyof typeof MRT_Localization_JA, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "名称",
        },
      },
      action: {
        moveUp: "上に移動",
        moveDown: "下へ移動",
      },
      menu: {
        label: {
          changePosition: "ポジションを変更する",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "設定",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "幅",
        },
        height: {
          label: "高さ",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "新しいタブで開く",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "レイアウト",
          option: {
            row: {
              label: "水平",
            },
            column: {
              label: "垂直",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "今日のブロック",
        adsBlockedTodayPercentage: "今日のブロック",
        dnsQueriesToday: "今日のクエリ",
      },
    },
    dnsHoleControls: {
      description: "ダッシュボードからPiHoleまたはAdGuardをコントロールする",
      option: {
        layout: {
          label: "レイアウト",
          option: {
            row: {
              label: "水平",
            },
            column: {
              label: "垂直",
            },
          },
        },
      },
      controls: {
        set: "設定",
        enabled: "有効",
        disabled: "無効",
        hours: "時間",
        minutes: "分",
      },
    },
    clock: {
      description: "現在の日付と時刻を表示します。",
      option: {
        timezone: {
          label: "タイムゾーン",
        },
      },
    },
    notebook: {
      name: "メモ帳",
      option: {
        showToolbar: {
          label: "マークダウンを書くのに役立つツールバーを表示する",
        },
        allowReadOnlyCheck: {
          label: "読み取り専用モードでのチェックを許可する",
        },
        content: {
          label: "ノートの内容",
        },
      },
      controls: {
        bold: "太字",
        italic: "斜体",
        strikethrough: "取り消し線",
        underline: "下線",
        colorText: "色付きテキスト",
        colorHighlight: "色付きのハイライトテキスト",
        code: "コード",
        clear: "書式をクリア",
        blockquote: "引用",
        horizontalLine: "水平線",
        bulletList: "箇条書きリスト",
        orderedList: "順序付きリスト",
        checkList: "チェックリスト",
        increaseIndent: "インデントを上げる",
        decreaseIndent: "インデントを下げる",
        link: "リンク",
        unlink: "リンクを削除",
        image: "画像を埋め込む",
        addTable: "テーブルを追加",
        deleteTable: "テーブルを削除",
        colorCell: "色付きテキスト",
        mergeCell: "セル結合の切り替え",
        addColumnLeft: "前に列を追加",
        addColumnRight: "後に列を追加",
        deleteColumn: "列を削除",
        addRowTop: "前に行を追加",
        addRowBelow: "後に行を追加",
        deleteRow: "行の削除",
      },
      align: {
        left: "左",
        center: "中央寄せ",
        right: "右",
      },
      popover: {
        clearColor: "色をクリア",
        source: "参照元",
        widthPlaceholder: "% またはピクセル単位の値",
        columns: "列数",
        rows: "行数",
        width: "幅",
        height: "高さ",
      },
    },
    iframe: {
      name: "iframe ",
      description:
        "インターネットから任意のコンテンツを埋め込みます。一部のウェブサイトではアクセスが制限される場合があります",
      option: {
        embedUrl: {
          label: "埋め込みURL",
        },
        allowFullScreen: {
          label: "フルスクリーンを許可する",
        },
        allowTransparency: {
          label: "透明を許可",
        },
        allowScrolling: {
          label: "スクロールを許可する",
        },
        allowPayment: {
          label: "支払いを許可する",
        },
        allowAutoPlay: {
          label: "自動再生を許可する",
        },
        allowMicrophone: {
          label: "マイクを許可する",
        },
        allowCamera: {
          label: "カメラを許可する",
        },
        allowGeolocation: {
          label: "位置情報を許可する",
        },
      },
      error: {
        noBrowerSupport: "お使いのブラウザは iframe をサポートしていません。ブラウザを更新してください。",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "エンティティID",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "表示名",
        },
        automationId: {
          label: "オートメーションID",
        },
      },
    },
    calendar: {
      name: "カレンダー",
      option: {
        releaseType: {
          label: "ラダーリリースタイプ",
        },
      },
    },
    weather: {
      name: "天気",
      description: "設定した場所の現在の天気情報を表示します。",
      option: {
        location: {
          label: "天候の場所",
        },
      },
      kind: {
        clear: "クリア",
        mainlyClear: "主なクリア事項",
        fog: "霧",
        drizzle: "小雨",
        freezingDrizzle: "雨氷",
        rain: "雨",
        freezingRain: "雨氷",
        snowFall: "降雪",
        snowGrains: "霧雪",
        rainShowers: "にわか雨",
        snowShowers: "スノーシャワー",
        thunderstorm: "サンダーストーム",
        thunderstormWithHail: "雹を伴う雷雨",
        unknown: "不明",
      },
    },
    indexerManager: {
      name: "インデックス・マネージャーのステータス",
      title: "インデクサーマネージャー",
      testAll: "すべてのテスト",
    },
    healthMonitoring: {
      name: "システムヘルスモニタリング",
      description: "システムの健全性とステータスを示す情報を表示します。",
      option: {
        fahrenheit: {
          label: "CPU温度（華氏）",
        },
        cpu: {
          label: "CPU 情報を表示",
        },
        memory: {
          label: "メモリー情報を表示",
        },
        fileSystem: {
          label: "ファイルシステム情報を表示",
        },
      },
      popover: {
        available: "利用可能",
      },
    },
    common: {
      location: {
        search: "検索",
        table: {
          header: {},
          population: {
            fallback: "不明",
          },
        },
      },
    },
    video: {
      name: "ビデオストリーム",
      description: "カメラやウェブサイトからのビデオストリームやビデオを埋め込む",
      option: {
        feedUrl: {
          label: "フィードURL",
        },
        hasAutoPlay: {
          label: "オートプレイ",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "追加日",
        },
        downSpeed: {
          columnTitle: "ダウンロード",
          detailsTitle: "ダウンロード速度",
        },
        integration: {
          columnTitle: "統合化",
        },
        progress: {
          columnTitle: "進捗状況",
        },
        ratio: {
          columnTitle: "比率",
        },
        state: {
          columnTitle: "状態",
        },
        upSpeed: {
          columnTitle: "アップロード",
        },
      },
      states: {
        downloading: "ダウンロード中",
        queued: "処理待ち",
        paused: "ポーズ",
        completed: "完了",
        unknown: "不明",
      },
    },
    "mediaRequests-requestList": {
      description: "OverseerrまたはJellyseerrからの全てのメディアリクエストのリストを見る",
      option: {
        linksTargetNewTab: {
          label: "リンクを新しいタブで開く",
        },
      },
      availability: {
        unknown: "不明",
        partiallyAvailable: "一部",
        available: "利用可能",
      },
    },
    "mediaRequests-requestStats": {
      description: "メディア・リクエストに関する統計",
      titles: {
        stats: {
          main: "メディア統計",
          approved: "すでに承認済み",
          pending: "承認待ち",
          tv: "テレビのリクエスト",
          movie: "映画のリクエスト",
          total: "合計",
        },
        users: {
          main: "トップユーザー",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "アプリ",
          },
          screenSize: {
            option: {
              sm: "小",
              md: "中",
              lg: "大",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "背景画像の添付ファイル",
      },
      backgroundImageSize: {
        label: "背景画像サイズ",
      },
      primaryColor: {
        label: "原色",
      },
      secondaryColor: {
        label: "セカンダリーカラー",
      },
      customCss: {
        description: "さらに、CSS を使用してダッシュボードをカスタマイズします。経験豊富なユーザーにのみお勧めします。",
      },
      name: {
        label: "名称",
      },
      isPublic: {
        label: "公開",
      },
    },
    setting: {
      section: {
        general: {
          title: "一般",
        },
        layout: {
          title: "レイアウト",
        },
        background: {
          title: "背景",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "ボードを見る",
              },
            },
          },
        },
        dangerZone: {
          title: "危険な操作",
          action: {
            delete: {
              confirm: {
                title: "ボードの削除",
              },
            },
          },
        },
      },
    },
  },
  management: {
    navbar: {
      items: {
        home: "ホーム",
        boards: "ボード",
        apps: "アプリ",
        users: {
          label: "ユーザー",
          items: {
            manage: "管理",
            invites: "招待",
          },
        },
        tools: {
          label: "ツール",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "設定",
        help: {
          label: "ヘルプ",
          items: {
            documentation: "ドキュメンテーション",
            discord: "コミュニティ・ディスコード",
          },
        },
        about: "About",
      },
    },
    page: {
      home: {
        statistic: {
          board: "ボード",
          user: "ユーザー",
          invite: "招待",
          app: "アプリ",
        },
        statisticLabel: {
          boards: "ボード",
        },
      },
      board: {
        title: "ボード",
        action: {
          settings: {
            label: "設定",
          },
          setHomeBoard: {
            badge: {
              label: "ホーム",
            },
          },
          delete: {
            label: "永久削除",
            confirm: {
              title: "ボードの削除",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "名称",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "一般",
            item: {
              firstDayOfWeek: "週の初日",
              accessibility: "アクセシビリティ",
            },
          },
          security: {
            title: "セキュリティ",
          },
          board: {
            title: "ボード",
          },
        },
        list: {
          metaTitle: "ユーザー管理",
          title: "ユーザー",
        },
        create: {
          metaTitle: "ユーザー作成",
          step: {
            security: {
              label: "セキュリティ",
            },
          },
        },
        invite: {
          title: "ユーザー招待の管理",
          action: {
            new: {
              description: "有効期限が過ぎると、招待は無効となり、招待を受けた人はアカウントを作成できなくなります。",
            },
            copy: {
              link: "招待リンク",
            },
            delete: {
              title: "招待の削除",
              description:
                "この招待状を削除してもよろしいですか？このリンクを持つユーザーは、そのリンクを使用してアカウントを作成できなくなります。",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "クリエイター",
            },
            expirationDate: {
              label: "有効期限",
            },
            token: {
              label: "トークン",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "一般",
          },
        },
      },
      settings: {
        title: "設定",
      },
      tool: {
        tasks: {
          status: {
            running: "実行中",
            error: "エラー",
          },
          job: {
            mediaServer: {
              label: "メディアサーバー",
            },
            mediaRequests: {
              label: "メディア・リクエスト",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "ドキュメンテーション",
            },
            apiKey: {
              table: {
                header: {
                  id: "ID",
                },
              },
            },
          },
        },
      },
    },
  },
  docker: {
    title: "コンテナ",
    field: {
      name: {
        label: "名称",
      },
      state: {
        label: "状態",
        option: {
          created: "作成",
          running: "実行中",
          paused: "ポーズ",
          restarting: "再起動中",
          removing: "削除中",
        },
      },
      containerImage: {
        label: "画像",
      },
      ports: {
        label: "ポート",
      },
    },
    action: {
      start: {
        label: "開始",
      },
      stop: {
        label: "停止",
      },
      restart: {
        label: "再起動",
      },
      remove: {
        label: "削除",
      },
    },
  },
  permission: {
    tab: {
      user: "ユーザー",
    },
    field: {
      user: {
        label: "ユーザー",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "管理",
      boards: {
        label: "ボード",
      },
      integrations: {
        edit: {
          label: "編集",
        },
      },
      "search-engines": {
        edit: {
          label: "編集",
        },
      },
      apps: {
        label: "アプリ",
        edit: {
          label: "編集",
        },
      },
      users: {
        label: "ユーザー",
        create: {
          label: "作成",
        },
        general: "一般",
        security: "セキュリティ",
        board: "ボード",
        invites: {
          label: "招待",
        },
      },
      tools: {
        label: "ツール",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "設定",
      },
      about: {
        label: "About",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "アプリ",
          },
          board: {
            title: "ボード",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "トレント",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "ヘルプ",
            option: {
              documentation: {
                label: "ドキュメンテーション",
              },
              discord: {
                label: "コミュニティ・ディスコード",
              },
            },
          },
        },
      },
      page: {
        group: {
          page: {
            option: {
              manageUser: {
                label: "ユーザー管理",
              },
              about: {
                label: "About",
              },
              preferences: {
                label: "あなたの好み",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "ユーザー",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "名称",
        },
      },
    },
  },
} as const;
