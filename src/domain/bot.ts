import type { BotId, OrderId, TimestampMs } from "./primitives";

export enum BotStatus {
  Idle = "IDLE",
  Processing = "PROCESSING"
}

export type IdleBot = {
  id: BotId;
  status: BotStatus.Idle;
  createdAt: TimestampMs;
};

export type ProcessingBot = {
  id: BotId;
  status: BotStatus.Processing;
  createdAt: TimestampMs;
  orderId: OrderId;
  pickedUpAt: TimestampMs;
  completesAt: TimestampMs;
};

export type Bot = IdleBot | ProcessingBot;

export type BotByStatus<TStatus extends BotStatus> = Extract<
  Bot,
  { status: TStatus }
>;

export type BotsByStatus = {
  [BotStatus.Idle]: IdleBot[];
  [BotStatus.Processing]: ProcessingBot[];
};

export type NewBotInput = {
  createdAt: TimestampMs;
};
