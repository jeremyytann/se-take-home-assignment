import type { BotId, OrderId, TimestampMs } from "./primitives";

export enum BotStatus {
  Idle = "IDLE",
  Processing = "PROCESSING"
}

export enum BotType {
  Normal = "NORMAL",
  Fast = "FAST"
}

export type IdleBot = {
  id: BotId;
  type: BotType;
  status: BotStatus.Idle;
  createdAt: TimestampMs;
};

export type ProcessingBot = {
  id: BotId;
  type: BotType;
  status: BotStatus.Processing;
  createdAt: TimestampMs;
  orderId: OrderId;
  pickedUpAt: TimestampMs;
  completesAt: TimestampMs;
  processingElapsedMs?: TimestampMs;
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
  type: BotType;
  createdAt: TimestampMs;
};
