const LINEAPI_TOKEN = PropertiesService.getScriptProperties().getProperty("LINEAPI_TOKEN");
const OPENAI_APIKEY = PropertiesService.getScriptProperties().getProperty("OPENAI_APIKEY");

const REPLY_URL = PropertiesService.getScriptProperties().getProperty("REPLY_URL") || "";
const TALK_LOG_SHEET_URL = PropertiesService.getScriptProperties().getProperty("TALK_LOG_SHEET_URL") || "";
const OPENAI_COMPLETIONS_URL = PropertiesService.getScriptProperties().getProperty("OPENAI_COMPLETIONS_URL") || "";

const AVATOR_URL_KYOTO = "https://github.com/gpioblink/anzen-kyoto/blob/logo/anzen-kyoto.jpeg?raw=true";
const AVATOR_URL_PRINCESS = "https://github.com/gpioblink/anzen-kyoto/blob/logo/anzen-ojousama.jpeg?raw=true";

const KYOTO_PROMPT = `
入力を「京言葉」と呼ばれる遠回しな言い方に置き換えてください。
対話ではなく、置き換えた結果を返してください。

## 考え方

依頼や辞退を表す時には、直接的な言い方は避け、婉曲的で非断定的な言い回しを好みます。例えば、「○○を下さい」と頼む際に「○○おくれやさしまへんやろか」（○○を下さりはしませんでしょうか）のように否定疑問で表現したり、釣銭が足りないことを店員に伝える際に「ちょっと足らんように思いますが」と間接的に表現したりします。辞退する時も、「おおきに」「考えときまっさ」などと曖昧な表現をすることによって、勧めてきた相手を敬った表現をします。また、「主人に訊かなければ分からない」などと他人を主体化させ、丁重に断る方法も良く用いられます。褒め言葉を使ってイケズ（意地悪）をすることもあり、例えば「おうちえー着物きたはりますな、きれーどすな」（お宅いい着物を着ておられますね、綺麗ですね）と言われても、綺麗と褒めているのは着物のことであり、その人について言っているとは限らないので安易に喜んではいけないといいます。

## 例

- 「こんにちは」 → 「こんにちは」
- 「おはようございます」 → 「おはようさん」
- 「疲れた」 → 「しんどいねん」
- 「部長に怒られた」 → 「部長さんに教えてもらえた」
- 「話が長過ぎる」 → 「えぇ時計してますなぁ」
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

## 返答

返答は、元の文章を含めず、結果だけを返してください。また、返答には「」を含めないでください。**会話ではなく、元の言葉を単に置き換えただけのものを返してください。**
`

function doPost(e: GoogleAppsScript.Events.DoPost) {
  Main.doPostRequestFromLINE(e);
}

class Main {
  public static doPostRequestFromLINE(e: GoogleAppsScript.Events.DoPost) {
    // イベントデータはJSON形式となっているため、parseして取得
    const eventData = JSON.parse(e.postData.contents).events[0];
    const replyToken = eventData.replyToken;
    const msgType = eventData.message.type;

    const kyotoTeacher = new Teacher(KYOTO_PROMPT, "まいこはん", AVATOR_URL_KYOTO);
    const lineBot = new LINEController(replyToken);

    if (msgType !== 'text') return;
    const userInputText = eventData.message.text;
    console.log(userInputText);

    if (userInputText === "!use:maikosan" || userInputText === "!use:princess") {
      // TODO: ユーザー処理を実装する。ステートが必要になるので一旦保留。
      lineBot.sendMessage("メニューが押されました! これはGPTからの返答ではありません。");
      return;
    }
    
    const assistantText = kyotoTeacher.teach(userInputText);
    lineBot.sendMessage(assistantText, kyotoTeacher.name, kyotoTeacher.avatorUrl);
    SpreadsheetAppController.addLog("user", userInputText);
    SpreadsheetAppController.addLog("assistant", assistantText);
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
    const histories = SpreadsheetAppController.getHistories();
    const prompt = ChatGPTHandler.generateFullPrompt(this.prompt, histories, message);
    return ChatGPTHandler.getAnswer(prompt);
  }
}

type SpreadsheetAppHistory = {
    user: string;
    assistant: string;
}

class SpreadsheetAppController {
  public static addLog(role:string , message: string) {
    const spreadSheet = SpreadsheetApp.openByUrl(TALK_LOG_SHEET_URL);
    const sheet = spreadSheet.getSheetByName("Sheet1");
    if(sheet === null) {
      console.log("シートが見つかりませんでした。");
      return;
    }
    const low = sheet.getLastRow();
    sheet.getRange(low + 1, 1).setValue(role);
    sheet.getRange(low + 1, 2).setValue(message);
  }

  public static getHistories(): SpreadsheetAppHistory[] {
    const histories = [];
    const examplesSheet = SpreadsheetApp.openByUrl(TALK_LOG_SHEET_URL).getSheetByName("examples");
    if (examplesSheet === null) {
      console.log("シートが見つかりませんでした。");
      return [];
    }
    for (let n = 1;;n++) {
      const userText = examplesSheet.getRange(n, 1).getValue();
      const assistantText = examplesSheet.getRange(n, 2).getValue();
      const isTextAvailable = (text: any) => typeof text === "string" && text.trim() !== "";
      if (!isTextAvailable(userText) || !isTextAvailable(assistantText)) {
        break;
      }
      histories.push({ "user": userText, "assistant": assistantText });
    }
    return histories;
  }
}
  
class LINEController {
  private replyToken: string;

  constructor(replyToken: string) {
    this.replyToken = replyToken;
  }
  public sendMessage(text: string, botUserName?: string, botIconUrl?: string) {
    const message = {
      'replyToken': this.replyToken,
      'messages': [{
        'type': 'text',
        'text': text,
        'sender': {
          // 'name': botUserName,
          'iconUrl': botIconUrl
        }
      }]
    }

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        'method': 'post',
        'headers': {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer ' + LINEAPI_TOKEN,
        },
        'payload': JSON.stringify(message)
      };
    UrlFetchApp.fetch(REPLY_URL, options);
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


