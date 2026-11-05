# Kru back end: setting up your Google Sheet

Kru keeps your class rosters, saved teams and scores in **one private Google Sheet** in your own Google Drive. A small script attached to that Sheet lets the Kru app read and write it. This takes about 10 minutes, once.

Nothing here puts student names in the code. They only ever live in your Sheet.

## 1. Make the Sheet and add the script

1. Go to [sheets.new](https://sheets.new) (signed in with your **personal Gmail** account). Name it something like **Kru data**.
2. In the Sheet, open **Extensions → Apps Script**. A new tab opens with an editor.
3. Delete everything in the editor (the empty `myFunction`).
4. Open [`Code.gs`](Code.gs) from this folder, copy **all** of it, and paste it into the editor.
5. Click the **💾 Save** icon. (You can rename the project "Kru" at the top-left if you like.)

## 2. Create the tabs and your secret key

1. Go back to the Sheet tab and **reload the page**. After a few seconds a **Kru** menu appears next to Help.
2. Click **Kru → Set up tabs**.
3. Google asks for permission the first time:
   - Click **Continue**, then choose your account.
   - You may see "Google hasn't verified this app". That's normal for your own script: click **Advanced → Go to Kru (unsafe)**. It's your own code, running on your own account.
   - Click **Allow**.
4. Click **Kru → Set up tabs** again if nothing happened. A box shows **your secret key** (like `k7m2p-xq9rt-b4hwz-3nfd8`). Copy it somewhere safe, such as your phone's Notes, but **not** into the code or a shared document.

You now have these tabs: **Classes, Rosters, TeamSets, Results, Sessions, Summary**, plus one tab per class (see [Class tabs](#class-tabs)).

> Lost the key? **Kru → Show my key**. Think it leaked? **Kru → Make a new key**, then sign in again on each device.

## 3. Publish the script as a web app

1. In the Apps Script tab, click the blue **Deploy** button → **New deployment**.
2. Click the ⚙️ gear next to "Select type" → **Web app**.
3. Fill in:
   - **Description:** `Kru`
   - **Execute as:** **Me** (your email)
   - **Who has access:** **Anyone**
4. Click **Deploy**. Allow permissions again if asked.
5. Copy the **Web app URL**. It ends in **`/exec`**. (Not the "Library" or `/dev` link.)

"Anyone" sounds scary but it's safe here: the script refuses every request that doesn't include your secret key, and it never shows data to someone just opening the link. (Opening the URL in a browser only says "Kru back end is running".)

## 4. Add your students

In the **Rosters** tab, one row per student:

| Class | No | Nickname | Active |
|---|---|---|---|
| M.3/2 | 1 | *(nickname)* | ☑ |
| M.3/2 | 2 | *(nickname)* | ☑ |

- **Class** exactly as you want it shown, for example `M.3/2`. The app works out the level (M.3) from the name.
- **Active**: untick for a student who has left. Their history stays; they just stop appearing.
- You can paste two columns straight from another spreadsheet.

The **Classes** tab is optional: add a class there if you want to set its **Order** on the home screen, a **DefaultTeamSize**, or tick **Archived** to hide it. Classes that only appear in Rosters still show up.

## 4b. Your own Quiz Battle questions (optional, script version 6 or later)

The **Questions** tab is where you add your own question sets for Quiz Battle. One row per question:

| Level | Set | Question | A | B | C | D | Answer | Double |
|---|---|---|---|---|---|---|---|---|
| M.2 | Unit 3 | What is the past of "go"? | goed | went | gone | | B | ☐ |
| M.2 | Unit 3 | Opposite of "cheap"? | | | | | expensive | ☑ |

- **Level**: `M.1`, `M.2` or `M.3`.
- **Set**: a name like `Unit 3` or `Food`. Questions with the same Level and Set make one set in the app.
- **Multiple choice**: fill **A** and **B** (C and D are optional), and put the right letter in **Answer** (`B`).
- **Short answer**: leave A–D empty and type the answer in **Answer**. It is shown when you tap Reveal.
- **Double**: tick it for a "double points" question.
- After adding questions, tap the **Synced…** pill at the top of the Kru home screen (or Dashboard → Settings → **Sync now**).
- If a row can't be used (for example no Answer), the app skips it and Quiz Battle tells you the row number.

## 5. Connect the app

1. On your iPhone, open the Kru website in **Safari**, tap **Share → Add to Home Screen**, then open Kru from the new icon.
2. Paste the **Web app URL** and type the **secret key**, then tap **Connect**.
3. Your classes appear. Tap one to see its students.

On a laptop, open the same website and sign in the same way.

## ⚠️ After you change the script later

When a Kru update gives you a new `Code.gs`:

1. Paste the new code over the old in the Apps Script editor and **Save**.
2. Click **Deploy → Manage deployments**.
3. Click the ✏️ **pencil** on your existing deployment.
4. Under **Version**, choose **New version**, then **Deploy**.

This keeps the **same URL**, so the app keeps working. Don't use "New deployment" for updates: that makes a **new** URL and the app would stop connecting until you sign in again with it.

If the update added new tabs or columns, run **Kru → Set up tabs** once more. It only adds what's missing and never deletes data.

## The Summary tab

**Summary** shows live totals from **Results**, with deleted games left out:
- **Column A onward:** each student's total points and number of games (Class · No · Nickname · Total points · Games).
- **Column H onward:** each class's total points.

It updates by itself when new results arrive. Kru writes this tab, so don't type in it. If you want your own notes, make a new tab. (If **Summary** holds something you typed yourself, Kru leaves it alone.)

## Class tabs

Each class gets its own tab, named after the class (**1/2**, **1/3**, … **M.3**). They are in the same order as in the app. Each tab shows live numbers from **Results**, with deleted games left out:
- **Column A onward:** each student's total points and number of games (No · Nickname · Total points · Games).
- **Column G onward:** every game the class played, newest first (Date · Game · Level · Team · No · Nickname · Points · Rank).

**Results** is still the master copy. The class tabs only *show* it, so editing or deleting a game in the app updates them by itself. Don't type in a class tab: Kru writes it, and **Kru → Set up tabs** replaces it. If a tab with a class's name holds something you typed yourself, Kru leaves it alone.

When the tabs appear:
- **Kru → Set up tabs** makes a tab for every class that isn't archived (and refreshes Kru's own ones).
- A new class gets its tab the first time you add it in the app or send it results.
- Renaming a class in the app renames its tab too.
- Archiving a class keeps its tab. Delete it by hand if you don't want it (right-click the tab → **Delete**). Your scores stay safe in **Results**.

## Troubleshooting

| The app says… | What to check |
|---|---|
| "Google sent back a web page instead of data" | The URL must end in `/exec`, and **Who has access** must be **Anyone**. |
| "The key was not accepted" | **Kru → Show my key** and type it again carefully. |
| "The Sheet isn't set up yet" | Run **Kru → Set up tabs**. |
| "Google couldn't find that script" | Copy the Web app URL again from **Deploy → Manage deployments**. |
| Changes to the script don't seem to work | You probably saved but didn't make a **New version** (see above). |
| A class shows up as a long date ("Fri Jan 02 2026…") | Sheets turned a class like `1/2` into a date. Run **Kru → Set up tabs**: it changes the Class columns to plain text and turns those dates back into `1/2`. Then tap Sync in the app. |
