import type { AnonymousLaw, AtMostOnceLaw, Law } from './types.js'
import type { EventPattern } from './matcher.js'

export class LawPattern {
  readonly ast: AnonymousLaw

  constructor(ast: AnonymousLaw) {
    this.ast = ast
  }

  partitionBy(path: string): LawPattern {
    if (path.length === 0) throw new Error('partition path cannot be empty')
    return new LawPattern({ ...this.ast, partitionBy: path })
  }
}

class EventuallyBuilder {
  constructor(
    private readonly trigger: EventPattern,
    private readonly consequent: EventPattern,
  ) {}

  within(withinMs: number): LawPattern {
    if (!Number.isFinite(withinMs) || withinMs < 0) {
      throw new Error('within must be a finite, non-negative number')
    }
    return new LawPattern({
      kind: 'eventually',
      trigger: this.trigger.ast,
      consequent: this.consequent.ast,
      withinMs,
    })
  }
}

class AfterBuilder {
  constructor(private readonly trigger: EventPattern) {}

  eventually(consequent: EventPattern): EventuallyBuilder {
    return new EventuallyBuilder(this.trigger, consequent)
  }
}

class NeverBuilder {
  constructor(private readonly forbidden: EventPattern) {}

  between(start: EventPattern, end: EventPattern): LawPattern {
    return new LawPattern({
      kind: 'neverBetween',
      forbidden: this.forbidden.ast,
      start: start.ast,
      end: end.ast,
    })
  }
}

class AtMostOnceBuilder {
  constructor(private readonly target: EventPattern) {}

  per(path: string): AtMostOncePattern {
    return this.build(path, false)
  }

  perEach(path: string): AtMostOncePattern {
    return this.build(path, true)
  }

  private build(path: string, each: boolean): AtMostOncePattern {
    if (path.length === 0) throw new Error('uniqueness key path cannot be empty')
    return new AtMostOncePattern({
      kind: 'atMostOnce',
      target: this.target.ast,
      keyPath: path,
      each,
      retention: { kind: 'forever' },
    })
  }
}

type AnonymousAtMostOnceLaw = Omit<AtMostOnceLaw, 'name'>

export class AtMostOncePattern extends LawPattern {
  constructor(ast: AnonymousAtMostOnceLaw) {
    super(ast)
  }

  override partitionBy(path: string): AtMostOncePattern {
    if (path.length === 0) throw new Error('partition path cannot be empty')
    return new AtMostOncePattern({ ...this.uniquenessAst(), partitionBy: path })
  }

  within(windowMs: number): AtMostOncePattern {
    if (!Number.isFinite(windowMs) || windowMs < 0) {
      throw new Error('uniqueness window must be a finite, non-negative number')
    }
    return new AtMostOncePattern({
      ...this.uniquenessAst(),
      retention: { kind: 'within', windowMs },
    })
  }

  resetOn(reset: EventPattern): AtMostOncePattern {
    return new AtMostOncePattern({
      ...this.uniquenessAst(),
      retention: { kind: 'resetOn', reset: reset.ast },
    })
  }

  private uniquenessAst(): AnonymousAtMostOnceLaw {
    return this.ast as AnonymousAtMostOnceLaw
  }
}

export function after(trigger: EventPattern): AfterBuilder {
  return new AfterBuilder(trigger)
}

export function never(forbidden: EventPattern): NeverBuilder {
  return new NeverBuilder(forbidden)
}

export function atMostOnce(target: EventPattern): AtMostOnceBuilder {
  return new AtMostOnceBuilder(target)
}

export function defineLaws(definitions: Record<string, LawPattern>): Law[] {
  return Object.entries(definitions).map(([name, definition]) => ({
    ...definition.ast,
    name,
  })) as Law[]
}
