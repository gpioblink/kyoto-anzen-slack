import { APIGatewayEventRequestContext, APIGatewayProxyCallback, APIGatewayProxyEvent, APIGatewayProxyResult, Context, Handler } from 'aws-lambda';

const SLACKBOT_VERIFICATION_TOKEN = process.env["SLACKBOT_VERIFICATION_TOKEN"] || "";
const SLACKBOT_AUTH_TOKEN = process.env["SLACKBOT_AUTH_TOKEN"] || "";
const SLACKBOT_MEMBER_ID = process.env["SLACKBOT_MEMBER_ID"] || "";

const OPENAI_APIKEY = process.env["OPENAI_APIKEY"] || "";

const TALK_LOG_SHEET_URL = process.env["TALK_LOG_SHEET_URL"] || "";
const OPENAI_COMPLETIONS_URL = process.env["OPENAI_COMPLETIONS_URL"] || "";

const AVATOR_URL_KYOTO = "https://github.com/gpioblink/anzen-kyoto/blob/logo/anzen-kyoto.jpeg?raw=true";
const AVATOR_URL_PRINCESS = "https://github.com/gpioblink/anzen-kyoto/blob/logo/anzen-ojousama.jpeg?raw=true";

const MAIKO_KEYWORD = "!use:maikosan";
const PRINCESS_KEYWORD = "!use:princess";


const KYOTO_PROMPT = `
入力を「京言葉」と呼ばれる遠回しな言い方に置き換えてください。
対話ではなく、置き換えた結果を返してください。

## 考え方

依頼や辞退を表す時には、直接的な言い方は避け、婉曲的で非断定的な言い回しを好みます。例えば、「○○を下さい」と頼む際に「○○おくれやさしまへんやろか」（○○を下さりはしませんでしょうか）のように否定疑問で表現したり、釣銭が足りないことを店員に伝える際に「ちょっと足らんように思いますが」と間接的に表現したりします。辞退する時も、「おおきに」「考えときまっさ」などと曖昧な表現をすることによって、勧めてきた相手を敬った表現をします。また、「主人に訊かなければ分からない」などと他人を主体化させ、丁重に断る方法も良く用いられます。褒め言葉を使ってイケズ（意地悪）をすることもあり、例えば「おうちえー着物きたはりますな、きれーどすな」（お宅いい着物を着ておられますね、綺麗ですね）と言われても、綺麗と褒めているのは着物のことであり、その人について言っているとは限らないので安易に喜んではいけないといいます。

## 例

- 「話が長い」 → 「えぇ時計してはりますなぁ」
- 「あいつの動きが悪い」 → 「あの方えらいおっとりしてはりますなぁ」
- 「彼女が指示に従わない」 → 「彼女さんは偉いどすなぁ」
- 「フレックス休日なのに候補日が指定されてて嫌」 → 「フレックス休日さかい少しはお休みを選べてええどすなあ」
- 「あいつTwitterの会話に顔真っ赤になってて草」 →  「あの方、Twitterでえらい情熱をお持ちやはりますなあ」
- 「ケンタッキーのアプリのUIがクソ」 → 「ケンタッキーはんのアプリのUIは個性的でいいどすなぁ」

## 言葉

返答は、元の文章を含めず、結果だけを返してください。また、「」を含めないでください。 **会話ではなく、元の言葉を単に置き換えただけのものを返してください。**
`

const PRINCESS_PROMPT = `
入力を「お嬢様言葉」と呼ばれる遠回しな言い方に置き換えてください。
対話ではなく、置き換えた結果を返してください。

## 考え方

お嬢様は一切ネガティブな単語を使いませんが、遠回しな皮肉を多用します。良いポイントを褒めつつ、遠回しに批判します。皮肉に気づいてもらえるよう、皮肉のポイントを追加して話します。いわゆる箱入りお嬢様であり、下ネタや悪い言葉は避けて話します。

語尾に「ですわ」や「あそばせ」をつけて話します。また、正しい敬語を用いて話します。

## 例

- 「こんにちは」 → 「ごきげんよう」
- 「ありがとう」 → 「ありがとうございますわ」
- 「ごめんなさい」 → 「お見苦しいところをお見せしましてごめんあそばせ」
- 「疲れた」 → 「お休みをいただきたく存じますわ」
- 「良くない」 → 「マリア様が見ていらっしゃるわ」
- 「東京は臭くて嫌いです」 → 「東京の香りには独特の魅力がございますわ」
- 「教授の話が長すぎて嫌だ」 → 「教授のお話は、さながら流れる水のように広く深い教えがございますわ。」
- 「新卒で会社に入ったけど、研修が思った以上にブラックで悲しい。早く辞めたい」 → 「新卒で入社した会社の研修が、なかなか刺激的でございまして、感動を隠せませんわ。これほどまでに充実した体験は、お早めに皆様へもお伝えしたく存じますわ。早々に別の道を探求したく存じますわ。」
- 「実際には諸条件があるのに100万円がもらえると書いてあって悪意があると思う」 → 「そちらの情報提供は、マリア様もきっと驚きを隠せないほどのご厚意が見受けられるかと存じますわ。しかしながら、条件については何ともロマンティックな隠し味が添えられているようでございますわ。何とも興味をそそられますことですわ。」
- 「明日は忙しすぎる」 → 「明日はまるでシンデレラの仕事量のようでございますわ」

## 返答

返答は、元の文章を含めず、結果だけを返してください。また、返答には「」を含めないでください。**会話ではなく、元の言葉を単に置き換えただけのものを返してください。**
`


/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler: Handler = async (event: APIGatewayProxyEvent, context: Context, callback: APIGatewayProxyCallback) => {

    // TODO: 本当はヘッダーのX-Slack-SignatureやX-Slack-Request-Timestampを使った認証を行うようにする
    const token = event.queryStringParameters?.token || "";
    if (SLACKBOT_VERIFICATION_TOKEN != token) {
      throw new Error("invalid token.");
    }

    // 3000msec以内にレスポンスを返さないとタイムアウトするので、とりあえず即座にレスポンスを返す
    callback(null, {
      statusCode: 200,
      body: "OK",
    });

    const reqDict = QueryString.decodeToMap(event.body || "");

    // ref: https://api.slack.com/interactivity/slash-commands#app_command_handling
    const userId = reqDict.get("user_id") || "";
    const responseUrl = reqDict.get("response_url") || "";
    const userInputText = reqDict.get("text") || "";
    console.log(userInputText);

    // TODO: userIDより前回ステートを参照して、使用するBOTを選択
    // const userState = UserStateDatabase.getCache(userId);
    const userState = (Math.random() > 0.5) ? MAIKO_KEYWORD : PRINCESS_KEYWORD;

    const kyotoTeacher = (userState !== PRINCESS_KEYWORD) ? new Teacher(KYOTO_PROMPT, "まいこはん", AVATOR_URL_KYOTO) : new Teacher(PRINCESS_PROMPT, "プリンセス", AVATOR_URL_PRINCESS);

    const slackController = new SlackController(responseUrl);

    if (userInputText === MAIKO_KEYWORD) {
      // UserStateDatabase.setCache(userId, MAIKO_KEYWORD);
      slackController.sendMessage("[心理的安全性サポーター変更] 「京都のまいこはん」に切り替えました。", "ephemeral");
      return;
    }

    if (userInputText === PRINCESS_KEYWORD) {
      // UserStateDatabase.setCache(userId, PRINCESS_KEYWORD);
      slackController.sendMessage("[心理的安全性サポーター変更] 「育ちの良いお嬢様」に切り替えました。", "ephemeral");
      return;
    }
    
    try {
      // 応答メッセージを取得する
      const assistantText = kyotoTeacher.teach(userInputText);
      // 応答メッセージが存在しない場合、処理を終了する
      if (!assistantText) return;

      // Slackに応答メッセージを投稿する
      slackController.sendMessage(assistantText, "in_channel");
      return;
    } catch (e: any) {
      console.error(e?.stack, "応答エラーが発生");
      return;
    }
};

class QueryString {
  public static decodeToMap(encodedText: string){
    const splited = encodedText.split("&");
    const dict = new Map(splited.map(s => {
      const [k, v] = s.split("=");
      return [decodeURIComponent(k), decodeURIComponent(v)]
    }));
    return dict;
  }
}

class Teacher {
  private prompt: string;
  public readonly name: string;
  public readonly avatorUrl: string;

  constructor(prompt: string, name:string, avatorUrl: string) {
    this.prompt = prompt;
    this.name = name;
    this.avatorUrl = avatorUrl;
  }

  public teach(message: string): string {
    // const histories = SpreadsheetAppController.getHistories();
    const prompt = ChatGPTHandler.generateFullPrompt(this.prompt, histories, message);
    return ChatGPTHandler.getAnswer(prompt);
  }
}

type SpreadsheetAppHistory = {
    user: string;
    assistant: string;
}

// class SpreadsheetAppController {
//   public static addLog(role:string , message: string) {
//     const spreadSheet = SpreadsheetApp.openByUrl(TALK_LOG_SHEET_URL);
//     const sheet = spreadSheet.getSheetByName("Sheet1");
//     if(sheet === null) {
//       console.log("シートが見つかりませんでした。");
//       return;
//     }
//     const low = sheet.getLastRow();
//     sheet.getRange(low + 1, 1).setValue(role);
//     sheet.getRange(low + 1, 2).setValue(message);
//   }

//   public static getHistories(): SpreadsheetAppHistory[] {
//     const histories = [];
//     const examplesSheet = SpreadsheetApp.openByUrl(TALK_LOG_SHEET_URL).getSheetByName("examples");
//     if (examplesSheet === null) {
//       console.log("シートが見つかりませんでした。");
//       return [];
//     }
//     for (let n = 1;;n++) {
//       const userText = examplesSheet.getRange(n, 1).getValue();
//       const assistantText = examplesSheet.getRange(n, 2).getValue();
//       const isTextAvailable = (text: any) => typeof text === "string" && text.trim() !== "";
//       if (!isTextAvailable(userText) || !isTextAvailable(assistantText)) {
//         break;
//       }
//       histories.push({ "user": userText, "assistant": assistantText });
//     }
//     return histories;
//   }
// }

// class UserStateDatabase {
//   private static cache = CacheService.getScriptCache();

//   public static setCache(key: string, value: string) {
//     this.cache.put(key, value, 21600);
//   }

//   public static getCache(key: string): string {
//     return this.cache.get(key) || MAIKO_KEYWORD;
//   }
// }

class SlackController {
  private readonly responseUrl: string;

  constructor(responseUrl: string) {
    this.responseUrl = responseUrl;
  }

  public sendMessage(text: string, visibility: "ephemeral" | "in_channel") {
    const payload = {
      "response_type": visibility,
      "text": text,
    };
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
    };
    UrlFetchApp.fetch(this.responseUrl, options);
  }
}

type ChatGPTCoversationLog = {
  role: string,
  content: string
};

class ChatGPTHandler {
  public static generateFullPrompt(prompt: string, histories: SpreadsheetAppHistory[], userInput: string): ChatGPTCoversationLog[] {
    const templatePrompt = {"role": "system", "content": prompt};
    const examplePrompt = this.generateHistoryPrompt(histories);
    const userPrompt = {"role": "user", "content": userInput};
    return [templatePrompt].concat(examplePrompt).concat([userPrompt]);
  }

  private static generateHistoryPrompt(histories: SpreadsheetAppHistory[]): ChatGPTCoversationLog[] {
    const exampleSubfixPrompt = {
      "role": "system",
      "content": "上記は変換の結果の一例です。こちらを参考に、変換を行ってください。"
    }

    const prompt = histories.flatMap(history => [
      {"role": "user", "content": history.user},
      {"role": "assistant", "content": history.assistant}
    ]);

    if(prompt.length !== 0) prompt.push(exampleSubfixPrompt);

    return prompt;
  }

  public static getAnswer(fullPrompt: ChatGPTCoversationLog[]) {
    //OpenAIのAPIリクエストに必要なヘッダー情報を設定
    const headers = {
      Authorization: "Bearer " + OPENAI_APIKEY,
      "Content-type": "application/json",
    };
    //ChatGPTモデルやトークン上限、プロンプトをオプションに設定
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      muteHttpExceptions: true,
      headers: headers,
      method: "post",
      payload: JSON.stringify({
        model: "gpt-4-turbo",
        messages: fullPrompt,
        temperature: 0.5,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }),
    };
    //OpenAIのChatGPTにAPIリクエストを送り、結果を変数に格納
    const response = JSON.parse(
      UrlFetchApp.fetch(OPENAI_COMPLETIONS_URL, options).getContentText()
    );
    //ChatGPTのAPIレスポンスをログ出力
    console.log(response.choices[0].message.content);
    return response.choices[0].message.content;
  }
}
