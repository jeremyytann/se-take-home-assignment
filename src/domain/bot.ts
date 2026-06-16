import type { BotId, OrderId, TimestampMs } from "./primitives";

export enum BotStatus {
  Idle = "IDLE",
  Processing = "PROCESSING",
  Paused = "PAUSED"
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

export type PausedIdleBot = {
  id: BotId;
  status: BotStatus.Paused;
  createdAt: TimestampMs;
  pausedAt: TimestampMs;
};

export type PausedProcessingBot = {
  id: BotId;
  status: BotStatus.Paused;
  createdAt: TimestampMs;
  orderId: OrderId;
  pickedUpAt: TimestampMs;
  completesAt: TimestampMs;
  pausedAt: TimestampMs;
  elapsedMs: TimestampMs;
  remainingMs: TimestampMs;
};

export type PausedBot = PausedIdleBot | PausedProcessingBot;

export type Bot = IdleBot | ProcessingBot | PausedBot;

export type BotByStatus<TStatus extends BotStatus> = Extract<
  Bot,
  { status: TStatus }
>;

export type BotsByStatus = {
  [BotStatus.Idle]: IdleBot[];
  [BotStatus.Processing]: ProcessingBot[];
  [BotStatus.Paused]: PausedBot[];
};

export type NewBotInput = {
  createdAt: TimestampMs;
};
