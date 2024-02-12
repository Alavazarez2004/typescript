import express, { Express, NextFunction, Request, Response } from "express";
import * as crypto from "crypto";
import axios from "axios";

const app: Express = express();
const port: number = 3000;

app.use(express.json());

const verify_signature = (req: Request) => {
  try {
    const signature = crypto
      .createHmac("sha256", "1234")
      .update(JSON.stringify(req.body))
      .digest("hex");
    const trusted = Buffer.from(`sha256=${signature}`, "ascii");
    const untrusted = Buffer.from(req.header("X-Hub-Signature-256") || "", "ascii");
    return crypto.timingSafeEqual(trusted, untrusted);
  } catch (error) {
    return false;
  }
};

const verifySignatureMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!verify_signature(req)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
  next();
};

app.post("/github-event", verifySignatureMiddleware, async (req: Request, res: Response) => {
  const { body } = req;
  const { action, sender, repository } = body;
  const event = req.header("x-github-event");
  let message = "";
  const signature = req.header("X-Hub-Signature-256");
  console.log("La firma es:", signature);

  switch (event) {
    case "star":
      message = `{sender.login} ${action} a star on ${repository.full_name}`;
      break;

    case "issue":
      const { issue } = body;
      message = `{sender.login} ${action} issue ${issue.title} on ${repository.full_name}`;
      break;
    case "push":
      message = `{sender.login} pushes on ${repository.full_name}`;
      break;

    default:
      message = `Evento desconocido ${event}`;
      break;
  }
  console.log(message);

  try {
    const webhookUrl = "https://discord.com/api/webhooks/1206622417645211719/B0ECN1JHokvbldXZms_4QptJj0akN68Lg4tyz3cwG4Tfw94Ki_elRB6I3JdVryyOz7iD";  //URL del discord
    await axios.post(webhookUrl, { content: message });
    console.log("Mensaje enviado");
  } catch (error) {
    console.error("Error al enviar el mensaje", error);
  }

  res.status(200).json({
    success: true,
  });
});

app.listen(port, () => console.log(`servidor corriendo en el puerto ${port}`));