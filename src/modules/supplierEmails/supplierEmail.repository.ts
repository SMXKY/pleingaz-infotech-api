import { BaseRepository } from "src/base/BaseRepository";
import { OrderEmail } from "src/generated/prisma";

export class OrderEmailRepository extends BaseRepository<OrderEmail> {
  protected modelName = "orderEmail ";
  protected hasSystemField = false;
}
