# Meta Developer Setup Guide: Instagram Automation

To enable your Instagram Comment monitoring and auto-reply system, you must configure your application within the Meta Developer Portal.

---

## 1. App Creation
1. Go to the [Meta Developer Portal](https://developers.facebook.com/).
2. Click **Create App**.
3. Select **Business** as the app type.
4. Give your app a name (e.g., "ReplySuite Automation").

## 2. Configure Instagram Graph API
1. In your App Dashboard, click **Add Product** in the sidebar.
2. Find **Instagram Graph API** and click **Set Up**.
3. Ensure your **Instagram Professional Account** is linked to a **Facebook Page**.
4. Link the Facebook Page to this Meta App.

## 3. Webhook Subscription
1. In the sidebar, go to **Webhooks**.
2. Select **Instagram** from the dropdown menu.
3. Click **Configure a Webhook**.
4. **Callback URL**: `https://<your-deployed-domain>.com/api/instagram/webhook`
5. **Verify Token**: Enter the same value you set for `INSTAGRAM_VERIFY_TOKEN` in your environment variables.
6. Click **Verify and Save**.
7. In the list of fields, find **comments** and click **Subscribe**.

## 4. Required Permissions (App Review)
For the automation to work for all users (not just developers), you must request the following permissions via App Review:
- `instagram_manage_comments`: To read and reply to comments.
- `instagram_manage_messages`: To send DMs from comments.
- `pages_show_list`: To discover managed pages.
- `pages_read_engagement`: To read page interactions.

> [!IMPORTANT]
> **Signature Verification**: Ensure `INSTAGRAM_CLIENT_SECRET` is added to your environment variables. The system uses this to verify that incoming data is really from Meta. You can find this in **Settings > Basic > App Secret**.

## 5. Testing
1. Use the **Webhooks Test Tool** in the App Dashboard.
2. Select **Instagram** and the **comments** field.
3. Send a sample payload to verify your server responds with `{ "status": "received" }`.
4. Check your server logs to ensure signatures are being validated correctly.
