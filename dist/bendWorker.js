// vendor/bend/bend2/base.bend
var base_default = `# Types
# =====

# Data
# ----

type Empty is Data:

type Unit is Data:
  Unit{}

type Bool is Data:
  False{}
  True{}

type Cmp is Data:
  LT{}
  EQ{}
  GT{}

type Either<a, b, -A: Kind(a), -B: Kind(b)> is Kind(a <&> b):
  Inl{value: A}
  Inr{value: B}

type Sigma<a, b, -A: Kind(a), -B: @-x: A -> Kind(b)> is Kind(a <&> b):
  Tuple{fst: A, snd: B(fst)}

type Nat is Data:
  Zero{}
  Succ{pred: Nat}

type Maybe<a, -A: Kind(a)> is Kind(a):
  None{}
  Some{value: A}

type Result<a, b, -E: Kind(a), -A: Kind(b)> is Kind(a <&> b):
  Fail{error: E}
  Done{value: A}

type List<a, -A: Kind(a)> is Kind(a):
  Nil{}
  Con{head: A, tail: List<a, A>}

law Word:
  for n: Nat
  Data

type Word.Nil is Data:
  WNil{}

type Word.Con<-p: Nat> is Data:
  WCon{head: Bool, tail: Word(p)}

type U32 is Data:
  U32{data: Word(32n)}

type F32 is Data:
  F32{data: Word(32n)}

type Char is Data:
  Chr{code: U32}

type String is Data:
  SNil{}
  SCon{head: Char, tail: String}

type Array<-T: Type> is Type:
  ALeaf{value: T}
  ANode{xs: Array<T>, ys: Array<T>}

type Image is Data:
  Pix{color: U32}
  Qua{tl: Image, tr: Image, bl: Image, br: Image}

type Event is Data:
  Key{code: U32, down: Bool}
  Mouse{x: U32, y: U32, button: U32, down: Bool}
  Move{x: U32, y: U32}
  Close{}

type Map<a, -V: Kind(a)> is Kind(a):
  MTip{}
  MLeaf{key: String, val: V}
  MNode{pos: Nat, lo: Map<a, V>, hi: Map<a, V>}

# Effects
# -------

# A handle is opaque, a law with no constructor and no field, so no
# program forges one, and linear (Type), so none copies or reuses one.
law File:
  Type

law Socket:
  Type

law Listener:
  Type

law Window:
  Type

law Audio:
  Type

# A channel is Data: the computations it links each hold a copy.
law Chan:
  for -A: Type
  Data

type IO.OP<-R: Type> is Type:
  Emit{value: R}
  Halt{code: U32, message: String}

law Pair:
  for -A: Type
  for -B: Type
  Type

law IO:
  for -A: Type
  Type

type App<-S: Type> is Type:
  App{view: S -> Pair(S, Image), tick: List<Event> -> S -> IO(Maybe<S>)}

# Defs
# ====

# Word
# ----

def Word(n):
  match n:
    case 0n:
      Word.Nil
    case 1n+p:
      Word.Con<p>

# Pair
# ----

def Pair(A, B):
  Sigma<&1, &1, A, _ => B>

def Exists(-A: Type, -B: @-x: A -> Type) -> Type:
  Sigma<&1, &1, A, B>

def Or(-A: Type, -B: Type) -> Type:
  Either<&1, &1, A, B>

def Pair.fst(-A: Type, -B: Type, p: A & B) -> A:
  (a, b) = p
  a

def Pair.snd(-A: Type, -B: Type, p: A & B) -> B:
  (a, b) = p
  b

# Effects
# -------

def IO(A):
  @-R: Type ->
  @k: (A -> IO.OP<R>) ->
  IO.OP<R>

def IO.pure(-A: Type, x: A) -> IO(A):
  R => k => k(x)

def IO.bind(-A: Type, -B: Type, m: IO(A), f: A -> IO(B)) -> IO(B):
  R => k => m(R, x => f(x, R, k))

def IO.print(text: String) -> IO(Unit):
  import "./effs/print.c"
  import "./effs/print.js"

def IO.write(text: String) -> IO(Unit):
  import "./effs/write.c"
  import "./effs/write.js"

def IO.print_err(text: String) -> IO(Unit):
  import "./effs/print_err.c"
  import "./effs/print_err.js"

def IO.get_env(name: String) -> IO(Result<&1, &1, U32 & String, String>):
  import "./effs/get_env.c"
  import "./effs/get_env.js"

def IO.args() -> IO(List<String>):
  import "./effs/args.c"
  import "./effs/args.js"

def IO.die(-A: Type, code: U32, msg: String) -> IO(A):
  R => k => Halt{code, msg}

def IO.pass(-A: Type, r: Result<&1, &1, U32 & String, A>) -> IO(A):
  match r:
    case Done{value}:
      IO.pure(A, value)
    case Fail{(code, message)}:
      IO.die(A, code, message)

def IO.try(-A: Type, act: IO(Result<&1, &1, U32 & String, A>)) -> IO(A):
  IO.bind(Result<&1, &1, U32 & String, A>, A, act, IO.pass(A))

def IO.random_u32() -> IO(Result<&1, &1, U32 & String, U32>):
  import "./effs/random_u32.c"
  import "./effs/random_u32.js"

def IO.spawn(-A: Type, act: IO(A)) -> IO(Unit):
  import "./effs/spawn.c"
  import "./effs/spawn.js"

def IO.sleep(ms: U32) -> IO(Unit):
  import "./effs/sleep.c"
  import "./effs/sleep.js"

def IO.now() -> IO(Nat):
  import "./effs/now.c"
  import "./effs/now.js"

def Chan.new(-A: Type, room: U32) -> IO(Chan(A)):
  import "./effs/chan_new.c"
  import "./effs/chan_new.js"

def Chan.send(-A: Type, chan: Chan(A), value: A) -> IO(Bool):
  import "./effs/chan_send.c"
  import "./effs/chan_send.js"

def Chan.recv(-A: Type, chan: Chan(A)) -> IO(Maybe<&1, A>):
  import "./effs/chan_recv.c"
  import "./effs/chan_recv.js"

def Chan.close(-A: Type, chan: Chan(A)) -> IO(Unit):
  import "./effs/chan_close.c"
  import "./effs/chan_close.js"

def IO.fork.go(-A: Type, act: IO(A), chan: Chan(A)) -> IO(Chan(A)):
  +c = chan
  sent = IO.bind(A, Bool, act, x => Chan.send(A, c, x))
  IO.bind(Unit, Chan(A), IO.spawn(Bool, sent), u => IO.pure(Chan(A), c))

def IO.fork(-A: Type, act: IO(A)) -> IO(Chan(A)):
  IO.bind(Chan(A), Chan(A), Chan.new(A, 1), IO.fork.go(A, act))

def IO.join.go(-A: Type, chan: Chan(A), got: Maybe<&1, A>) -> IO(A):
  match got:
    case None{}:
      IO.die(A, 1, "IO.join: the channel was closed")
    case Some{value}:
      IO.bind(Unit, A, Chan.close(A, chan), u => IO.pure(A, value))

def IO.join(-A: Type, +chan: Chan(A)) -> IO(A):
  IO.bind(Maybe<&1, A>, A, Chan.recv(A, chan), IO.join.go(A, chan))

def File.open(path: String, mode: String) ->
  IO(Result<&1, &1, U32 & String, File>):
  import "./effs/file_open.c"
  import "./effs/file_open.js"

def File.read(file: File, max: U32) ->
  IO(File & Result<&1, &1, U32 & String, String>):
  import "./effs/file_read.c"
  import "./effs/file_read.js"

def File.read_bytes(file: File, max: U32) ->
  IO(File & Result<&1, &1, U32 & String, List<&2, U32>>):
  import "./effs/file_read_bytes.c"
  import "./effs/file_read_bytes.js"

def File.read_at(file: File, offset: U32, max: U32) ->
  IO(File & Result<&1, &1, U32 & String, List<&2, U32>>):
  import "./effs/file_read_at.c"
  import "./effs/file_read_at.js"

def File.size(file: File) ->
  IO(File & Result<&1, &1, U32 & String, U32>):
  import "./effs/file_size.c"
  import "./effs/file_size.js"

def File.write(file: File, data: String) ->
  IO(File & Result<&1, &1, U32 & String, Unit>):
  import "./effs/file_write.c"
  import "./effs/file_write.js"

def File.write_bytes(file: File, data: List<&2, U32>) ->
  IO(File & Result<&1, &1, U32 & String, Unit>):
  import "./effs/file_write_bytes.c"
  import "./effs/file_write_bytes.js"

def File.close(file: File) -> IO(Unit):
  import "./effs/file_close.c"
  import "./effs/file_close.js"

def TCP.listen(port: U32) -> IO(Result<&1, &1, U32 & String, Listener>):
  import "./effs/tcp_listen.c"
  import "./effs/tcp_listen.js"

def TCP.accept(listener: Listener) ->
  IO(Listener & Result<&1, &1, U32 & String, Socket>):
  import "./effs/tcp_accept.c"
  import "./effs/tcp_accept.js"

def TCP.connect(host: String, port: U32) ->
  IO(Result<&1, &1, U32 & String, Socket>):
  import "./effs/tcp_connect.c"
  import "./effs/tcp_connect.js"

def TCP.send(sock: Socket, data: String) ->
  IO(Socket & Result<&1, &1, U32 & String, Unit>):
  import "./effs/tcp_send.c"
  import "./effs/tcp_send.js"

def TCP.recv(sock: Socket, max: U32) ->
  IO(Socket & Result<&1, &1, U32 & String, String>):
  import "./effs/tcp_recv.c"
  import "./effs/tcp_recv.js"

def TCP.poll(sock: Socket, max: U32, ms: U32) ->
  IO(Socket & Result<&1, &1, U32 & String, Maybe<&1, String>>):
  import "./effs/tcp_poll.c"
  import "./effs/tcp_poll.js"

def UDP.bind(port: U32) -> IO(Result<&1, &1, U32 & String, Socket>):
  import "./effs/udp_bind.c"
  import "./effs/udp_bind.js"

def UDP.send_to(sock: Socket, host: String, port: U32, data: String) ->
  IO(Socket & Result<&1, &1, U32 & String, Unit>):
  import "./effs/udp_send_to.c"
  import "./effs/udp_send_to.js"

def UDP.recv_from(sock: Socket, max: U32) ->
  IO(Socket & Result<&1, &1, U32 & String, String & U32 & String>):
  import "./effs/udp_recv_from.c"
  import "./effs/udp_recv_from.js"

def UDP.poll(sock: Socket, max: U32) ->
  IO(Socket & Result<&1, &1, U32 & String, Maybe<&1, String & U32 & String>>):
  import "./effs/udp_poll.c"
  import "./effs/udp_poll.js"

def Socket.close(socket: Socket) -> IO(Unit):
  import "./effs/socket_close.c"
  import "./effs/socket_close.js"

def Listener.close(listener: Listener) -> IO(Unit):
  import "./effs/listener_close.c"
  import "./effs/listener_close.js"

def Window.open(title: String, width: U32, height: U32) ->
  IO(Result<&1, &1, U32 & String, Window>):
  import "./effs/window_open.c"
  import "./effs/window_open.js"

def Window.frame(window: Window, image: Image) ->
  IO(Window & Image & List<Event>):
  import "./effs/window_frame.c"
  import "./effs/window_frame.js"

def Window.set_title(window: Window, title: String) -> IO(Window):
  import "./effs/window_set_title.c"
  import "./effs/window_set_title.js"

def Window.close(window: Window) -> IO(Unit):
  import "./effs/window_close.c"
  import "./effs/window_close.js"

def Audio.open(rate: U32) -> IO(Result<&1, &1, U32 & String, Audio>):
  import "./effs/audio_open.c"
  import "./effs/audio_open.js"

def Audio.write(audio: Audio, samples: List<&2, F32>) -> IO(Audio & U32):
  import "./effs/audio_write.c"
  import "./effs/audio_write.js"

def Audio.close(audio: Audio) -> IO(Unit):
  import "./effs/audio_close.c"
  import "./effs/audio_close.js"

# Equal
# -----

law Equal.cong:
  for -A: Type
  for -B: Type
  for -f: A -> B
  for -a: A
  for -b: A
  for  e: {a == b : A}
  {f(a) == f(b) : B}

def Equal.cong(A, B, f, a, b, e):
  %e : {f(a) == f(_) : B}
  {==}

law Equal.sym:
  for -A: Type
  for -a: A
  for -b: A
  for  e: {a == b : A}
  {b == a : A}

def Equal.sym(A, a, b, e):
  %e : {_ == a : A}
  {==}

law Equal.trans:
  for -A : Type
  for -a : A
  for -b : A
  for -c : A
  for ab : {a == b : A}
  for bc : {b == c : A}
  {a == c : A}

def Equal.trans(A, a, b, c, ab, bc):
  %bc : {a == _ : A}
  ab

# Empty
# -----

def Empty.absurd(-A: Type, e: Empty) -> A:
  match e:

# Bool
# ----

def Bool.not(b: Bool) -> Bool:
  match b:
    case False{}:
      True{}
    case True{}:
      False{}

def Bool.and(a: Bool, b: Bool) -> Bool:
  match a:
    case False{}:
      False{}
    case True{}:
      b

def Bool.or(a: Bool, b: Bool) -> Bool:
  match a:
    case False{}:
      b
    case True{}:
      True{}

def Bool.xor(a: Bool, b: Bool) -> Bool:
  match a:
    case False{}:
      b
    case True{}:
      Bool.not(b)

def Bool.cmp(a: Bool, b: Bool) -> Cmp:
  match a b:
    case False{} False{}:
      EQ{}
    case False{} True{}:
      LT{}
    case True{} False{}:
      GT{}
    case True{} True{}:
      EQ{}

def Bool.full_add(a: Bool, b: Bool, c: Bool) -> Bool & Bool:
  match a b c:
    case False{} False{} False{}:
      (False{}, False{})
    case False{} False{} True{}:
      (True{}, False{})
    case False{} True{} False{}:
      (True{}, False{})
    case False{} True{} True{}:
      (False{}, True{})
    case True{} False{} False{}:
      (True{}, False{})
    case True{} False{} True{}:
      (False{}, True{})
    case True{} True{} False{}:
      (False{}, True{})
    case True{} True{} True{}:
      (True{}, True{})

def Bool.pick(-A: Type, c: Bool, a: A, b: A) -> A:
  match c:
    case False{}:
      b
    case True{}:
      a

def Bool.to_u32(b: Bool) -> U32:
  match b:
    case False{}:
      0
    case True{}:
      1

# Cmp
# ---

def Cmp.is_lt(c: Cmp) -> Bool:
  match c:
    case LT{}:
      True{}
    case EQ{}:
      False{}
    case GT{}:
      False{}

def Cmp.is_eq(c: Cmp) -> Bool:
  match c:
    case LT{}:
      False{}
    case EQ{}:
      True{}
    case GT{}:
      False{}

def Cmp.is_gt(c: Cmp) -> Bool:
  match c:
    case LT{}:
      False{}
    case EQ{}:
      False{}
    case GT{}:
      True{}

def Cmp.is_le(c: Cmp) -> Bool:
  match c:
    case LT{}:
      True{}
    case EQ{}:
      True{}
    case GT{}:
      False{}

def Cmp.is_ge(c: Cmp) -> Bool:
  match c:
    case LT{}:
      False{}
    case EQ{}:
      True{}
    case GT{}:
      True{}

# Nat
# ---

def Nat.double(n: Nat) -> Nat:
  match n:
    case 0n:
      0n
    case 1n+p:
      2n+Nat.double(p)

def Nat.add(a: Nat, b: Nat) -> Nat:
  match a:
    case 0n:
      b
    case 1n+p:
      1n+Nat.add(p, b)

def Nat.sub(a: Nat, b: Nat) -> Nat:
  match a b:
    case 0n 0n:
      0n
    case 0n 1n+bp:
      0n
    case 1n+ap 0n:
      1n+ap
    case 1n+ap 1n+bp:
      Nat.sub(ap, bp)

def Nat.mul(a: Nat, +b: Nat) -> Nat:
  match a:
    case 0n:
      0n
    case 1n+p:
      Nat.add(b, Nat.mul(p, b))

def Nat.divmod.go(n: Nat, m: Nat, d: Nat, r: Nat) -> Nat & Nat:
  match n:
    case 0n:
      (d, r)
    case 1n+np:
      match m:
        case 0n:
          Nat.divmod.go(np, r, 1n+d, 0n)
        case 1n+mp:
          Nat.divmod.go(np, mp, d, 1n+r)

def Nat.divmod(a: Nat, b: Nat) -> Nat & Nat:
  match b:
    case 0n:
      (0n, a)
    case 1n+bp:
      Nat.divmod.go(a, bp, 0n, 0n)

def Nat.cmp(a: Nat, b: Nat) -> Cmp:
  match a b:
    case 0n 0n:
      EQ{}
    case 0n 1n+bp:
      LT{}
    case 1n+ap 0n:
      GT{}
    case 1n+ap 1n+bp:
      Nat.cmp(ap, bp)

def Nat.is_lt(a: Nat, b: Nat) -> Bool:
  Cmp.is_lt(Nat.cmp(a, b))

def Nat.is_eq(a: Nat, b: Nat) -> Bool:
  Cmp.is_eq(Nat.cmp(a, b))

def Nat.is_ne(a: Nat, b: Nat) -> Bool:
  Bool.not(Cmp.is_eq(Nat.cmp(a, b)))

def Nat.is_le(a: Nat, b: Nat) -> Bool:
  Cmp.is_le(Nat.cmp(a, b))

def Nat.is_gt(a: Nat, b: Nat) -> Bool:
  Cmp.is_gt(Nat.cmp(a, b))

def Nat.is_ge(a: Nat, b: Nat) -> Bool:
  Cmp.is_ge(Nat.cmp(a, b))

def Nat.min(+a: Nat, +b: Nat) -> Nat:
  match a b:
    case 0n _:
      0n
    case 1n+ap 0n:
      0n
    case 1n+ap 1n+bp:
      1n+Nat.min(ap, bp)

def Nat.max(+a: Nat, +b: Nat) -> Nat:
  match a b:
    case 0n _:
      b
    case 1n+ap 0n:
      1n+ap
    case 1n+ap 1n+bp:
      1n+Nat.max(ap, bp)

law Nat.ge_refl:
  for a: Nat
  {Nat.is_ge(a, a) == True{} : Bool}

def Nat.ge_refl(a):
  match a:
    case 0n:
      {==}
    case 1n+p:
      Nat.ge_refl(p)

law Nat.max_ge_l:
  for +a: Nat
  for +b: Nat
  {Nat.is_ge(Nat.max(a, b), a) == True{} : Bool}

def Nat.max_ge_l(a, b):
  match a b:
    case 0n 0n:
      {==}
    case 0n 1n+bp:
      {==}
    case 1n+ap 0n:
      Nat.ge_refl(a)
    case 1n+ap 1n+bp:
      Nat.max_ge_l(ap, bp)

law Nat.max_ge_r:
  for +a: Nat
  for +b: Nat
  {Nat.is_ge(Nat.max(a, b), b) == True{} : Bool}

def Nat.max_ge_r(a, b):
  match a b:
    case 0n _:
      Nat.ge_refl(b)
    case 1n+ap 0n:
      {==}
    case 1n+ap 1n+bp:
      Nat.max_ge_r(ap, bp)

def Nat.div.fin(qr: Nat & Nat) -> Nat:
  (q, r) = qr
  q

def Nat.div(a: Nat, b: Nat) -> Nat:
  Nat.div.fin(Nat.divmod(a, b))

def Nat.mod.fin(qr: Nat & Nat) -> Nat:
  (q, r) = qr
  r

def Nat.mod(a: Nat, b: Nat) -> Nat:
  Nat.mod.fin(Nat.divmod(a, b))

def Nat.pow(+a: Nat, b: Nat) -> Nat:
  match b:
    case 0n:
      1n
    case 1n+p:
      Nat.mul(a, Nat.pow(a, p))

# Maybe
# -----

def Maybe.pure(a, -A: Kind(a), x: A) -> Maybe<a, A>:
  Some{x}

def Maybe.bind(
  a, -A: Kind(a), -B: Kind(a), m: Maybe<a, A>, f: A -> Maybe<a, B>
) -> Maybe<a, B>:
  match m:
    case None{}:
      None{}
    case Some{x}:
      f(x)

def Maybe.default(a, -A: Kind(a), m: Maybe<a, A>, d: A) -> A:
  match m:
    case None{}:
      d
    case Some{x}:
      x

def Maybe.is_some(a, -A: Kind(a), m: Maybe<a, A>) -> Bool:
  match m:
    case None{}:
      False{}
    case Some{x}:
      True{}

def Maybe.is_none(a, -A: Kind(a), m: Maybe<a, A>) -> Bool:
  Bool.not(Maybe.is_some(a, A, m))

def Maybe.map(
  a, -A: Kind(a), -B: Kind(a), f: A -> B, m: Maybe<a, A>
) -> Maybe<a, B>:
  match m:
    case None{}:
      None{}
    case Some{x}:
      Some{f(x)}

def Maybe.or(a, -A: Kind(a), m: Maybe<a, A>, n: Maybe<a, A>) -> Maybe<a, A>:
  match m:
    case None{}:
      n
    case Some{x}:
      Some{x}

# Result
# ------

def Result.pure(a, b, -E: Kind(a), -A: Kind(b), x: A) -> Result<a, b, E, A>:
  Done{x}

def Result.bind(
  a, b, -E: Kind(a), -A: Kind(b), -B: Kind(b), r: Result<a, b, E, A>,
  f: A -> Result<a, b, E, B>
) -> Result<a, b, E, B>:
  match r:
    case Fail{e}:
      Fail{e}
    case Done{x}:
      f(x)

def Result.default(
  a, b, -E: Kind(a), -A: Kind(b), r: Result<a, b, E, A>, d: A
) -> A:
  match r:
    case Fail{e}:
      d
    case Done{x}:
      x

def Result.is_done(
  a, b, -E: Kind(a), -A: Kind(b), r: Result<a, b, E, A>
) -> Bool:
  match r:
    case Fail{e}:
      False{}
    case Done{x}:
      True{}

def Result.is_fail(
  a, b, -E: Kind(a), -A: Kind(b), r: Result<a, b, E, A>
) -> Bool:
  Bool.not(Result.is_done(a, b, E, A, r))

def Result.map(
  a, b, -E: Kind(a), -A: Kind(b), -B: Kind(b), f: A -> B,
  r: Result<a, b, E, A>
) -> Result<a, b, E, B>:
  match r:
    case Fail{e}:
      Fail{e}
    case Done{x}:
      Done{f(x)}

# List
# ----

def List.map(~A: Type, ~B: Type, ~f: A -> B, xs: List<A>) -> List<B>:
  match xs:
    case Nil{}:
      Nil{}
    case h <> t:
      f(h) <> List.map(~A, ~B, ~f, t)

def List.length(a, -A: Kind(a), xs: List<a, A>) -> Nat:
  match xs:
    case Nil{}:
      0n
    case h <> t:
      1n+List.length(a, A, t)

def List.append(a, -A: Kind(a), xs: List<a, A>, ys: List<a, A>) -> List<a, A>:
  match xs:
    case Nil{}:
      ys
    case h <> t:
      h <> List.append(a, A, t, ys)

def List.concat(a, -A: Kind(a), xss: List<a, List<a, A>>) -> List<a, A>:
  match xss:
    case Nil{}:
      Nil{}
    case h <> t:
      List.append(a, A, h, List.concat(a, A, t))

def List.reverse.go(a, -A: Kind(a), xs: List<a, A>, acc: List<a, A>) ->
  List<a, A>:
  match xs:
    case Nil{}:
      acc
    case h <> t:
      List.reverse.go(a, A, t, h <> acc)

def List.reverse(a, -A: Kind(a), xs: List<a, A>) -> List<a, A>:
  List.reverse.go(a, A, xs, Nil{})

def List.is_empty(a, -A: Kind(a), xs: List<a, A>) -> Bool:
  match xs:
    case Nil{}:
      True{}
    case h <> t:
      False{}

def List.head(a, -A: Kind(a), xs: List<a, A>) -> Maybe<a, A>:
  match xs:
    case Nil{}:
      None{}
    case h <> t:
      Some{h}

def List.tail(a, -A: Kind(a), xs: List<a, A>) -> List<a, A>:
  match xs:
    case Nil{}:
      Nil{}
    case h <> t:
      t

def List.last.go(a, -A: Kind(a), xs: List<a, A>, last: A) -> A:
  match xs:
    case Nil{}:
      last
    case h <> t:
      List.last.go(a, A, t, h)

def List.last(a, -A: Kind(a), xs: List<a, A>) -> Maybe<a, A>:
  match xs:
    case Nil{}:
      None{}
    case h <> t:
      Some{List.last.go(a, A, t, h)}

def List.get(a, -A: Kind(a), xs: List<a, A>, n: Nat) -> Maybe<a, A>:
  match xs n:
    case Nil{} _:
      None{}
    case h <> t 0n:
      Some{h}
    case h <> t 1n+p:
      List.get(a, A, t, p)

def List.set(a, -A: Kind(a), xs: List<a, A>, n: Nat, x: A) -> List<a, A>:
  match xs n:
    case Nil{} _:
      Nil{}
    case h <> t 0n:
      x <> t
    case h <> t 1n+p:
      h <> List.set(a, A, t, p, x)

def List.take(a, -A: Kind(a), xs: List<a, A>, n: Nat) -> List<a, A>:
  match xs n:
    case Nil{} _:
      Nil{}
    case h <> t 0n:
      Nil{}
    case h <> t 1n+p:
      h <> List.take(a, A, t, p)

def List.drop(a, -A: Kind(a), xs: List<a, A>, n: Nat) -> List<a, A>:
  match xs n:
    case Nil{} _:
      Nil{}
    case h <> t 0n:
      h <> t
    case h <> t 1n+p:
      List.drop(a, A, t, p)

def List.zip(
  a, -A: Kind(a), b, -B: Kind(b), xs: List<a, A>, ys: List<b, B>
) -> List<&1, A & B>:
  match xs ys:
    case Nil{} _:
      Nil{}
    case h <> t Nil{}:
      Nil{}
    case x <> xt y <> yt:
      (x, y) <> List.zip(a, A, b, B, xt, yt)

def List.range.go(+n: Nat, acc: List<&2, Nat>) -> List<&2, Nat>:
  match n:
    case 0n:
      acc
    case 1n+p:
      List.range.go(p, p <> acc)

def List.range(n: Nat) -> List<&2, Nat>:
  List.range.go(n, Nil{})

def List.replicate(-A: Data, n: Nat, +x: A) -> List<&2, A>:
  match n:
    case 0n:
      Nil{}
    case 1n+p:
      x <> List.replicate(A, p, x)

def List.filter.put(-A: Data, h: A, r: List<&2, A>, keep: Bool) -> List<&2, A>:
  match keep:
    case False{}:
      r
    case True{}:
      h <> r

def List.filter(~A: Data, ~f: A -> Bool, xs: List<&2, A>) -> List<&2, A>:
  match xs:
    case Nil{}:
      Nil{}
    case +h <> t:
      List.filter.put(A, h, List.filter(~A, ~f, t), f(h))

def List.foldl(
  ~a: Quant, ~A: Kind(a), ~B: Type, ~f: B -> A -> B, xs: List<a, A>, acc: B
) -> B:
  match xs:
    case Nil{}:
      acc
    case h <> t:
      List.foldl(~a, ~A, ~B, ~f, t, f(acc, h))

def List.foldr(
  ~a: Quant, ~A: Kind(a), ~B: Type, ~f: A -> B -> B, xs: List<a, A>, z: B
) -> B:
  match xs:
    case Nil{}:
      z
    case h <> t:
      f(h, List.foldr(~a, ~A, ~B, ~f, t, z))

def List.any(~a: Quant, ~A: Kind(a), ~f: A -> Bool, xs: List<a, A>) -> Bool:
  match xs:
    case Nil{}:
      False{}
    case h <> t:
      Bool.or(f(h), List.any(~a, ~A, ~f, t))

def List.all(~a: Quant, ~A: Kind(a), ~f: A -> Bool, xs: List<a, A>) -> Bool:
  match xs:
    case Nil{}:
      True{}
    case h <> t:
      Bool.and(f(h), List.all(~a, ~A, ~f, t))

def List.find.put(-A: Data, h: A, r: Maybe<&2, A>, hit: Bool) -> Maybe<&2, A>:
  match hit:
    case False{}:
      r
    case True{}:
      Some{h}

def List.find(~A: Data, ~f: A -> Bool, xs: List<&2, A>) -> Maybe<&2, A>:
  match xs:
    case Nil{}:
      None{}
    case +h <> t:
      List.find.put(A, h, List.find(~A, ~f, t), f(h))

def List.contains(
  ~A: Data, ~eq: A -> A -> Bool, xs: List<&2, A>, +x: A
) -> Bool:
  match xs:
    case Nil{}:
      False{}
    case h <> t:
      Bool.or(eq(h, x), List.contains(~A, ~eq, t, x))

def List.merge.step(
  -A: Data, acc: List<&2, A>, x: A, xt: List<&2, A>, y: A, yt: List<&2, A>,
  le: Bool
) -> List<&2, A> & List<&2, A> & List<&2, A>:
  match le:
    case False{}:
      (y <> acc, x <> xt, yt)
    case True{}:
      (x <> acc, xt, y <> yt)

# The fuel bounds the steps: a sort passes its length, enough for any merge.
def List.merge.go(
  ~A: Data, ~le: A -> A -> Bool, fuel: Nat,
  st: List<&2, A> & List<&2, A> & List<&2, A>
) -> List<&2, A>:
  match fuel:
    case 0n:
      (acc, xs, ys) = st
      List.reverse.go(&2, A, acc, List.append(&2, A, xs, ys))
    case 1n+f:
      (acc, xs, ys) = st
      match xs ys:
        case Nil{} Nil{}:
          List.reverse.go(&2, A, acc, Nil{})
        case Nil{} y <> yt:
          List.reverse.go(&2, A, acc, y <> yt)
        case x <> xt Nil{}:
          List.reverse.go(&2, A, acc, x <> xt)
        case +x <> xt +y <> yt:
          List.merge.go(~A, ~le, f,
            List.merge.step(A, acc, x, xt, y, yt, le(x, y)))

def List.sort.runs(-A: Data, xs: List<&2, A>) -> List<&2, List<&2, A>>:
  match xs:
    case Nil{}:
      Nil{}
    case h <> t:
      [h] <> List.sort.runs(A, t)

def List.sort.pass(
  ~A: Data, ~le: A -> A -> Bool, +n: Nat, runs: List<&2, List<&2, A>>
) -> List<&2, List<&2, A>>:
  match runs:
    case Nil{}:
      Nil{}
    case r <> Nil{}:
      [r]
    case r1 <> r2 <> rest:
      List.merge.go(~A, ~le, n, (Nil{}, r1, r2))
        <> List.sort.pass(~A, ~le, n, rest)

def List.sort.go(
  ~A: Data, ~le: A -> A -> Bool, fuel: Nat, +n: Nat, runs: List<&2, List<&2, A>>
) -> List<&2, A>:
  match fuel:
    case 0n:
      List.concat(&2, A, runs)
    case 1n+f:
      match runs:
        case Nil{}:
          Nil{}
        case r <> Nil{}:
          r
        case r1 <> r2 <> rest:
          List.sort.go(~A, ~le, f, n,
            List.sort.pass(~A, ~le, n, r1 <> r2 <> rest))

def List.sort(~A: Data, ~le: A -> A -> Bool, +xs: List<&2, A>) -> List<&2, A>:
  +n = List.length(&2, A, xs)
  List.sort.go(~A, ~le, n, n, List.sort.runs(A, xs))

def List.for_each(
  ~a: Quant, ~A: Kind(a), ~f: A -> IO(Unit), xs: List<a, A>
) -> IO(Unit):
  match xs:
    case Nil{}:
      IO.pure(Unit, Unit{})
    case h <> t:
      IO.bind(Unit, Unit, f(h), u => List.for_each(~a, ~A, ~f, t))

# Word
# ----

def Word.zero(n: Nat) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      WCon{False{}, Word.zero(p)}

def Word.not(n: Nat, w: Word(n)) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match w:
        case WCon{b, t}:
          WCon{Bool.not(b), Word.not(p, t)}

def Word.and(n: Nat, a: Word(n), b: Word(n)) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match a b:
        case WCon{ab, at} WCon{bb, bt}:
          WCon{Bool.and(ab, bb), Word.and(p, at, bt)}

def Word.or(n: Nat, a: Word(n), b: Word(n)) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match a b:
        case WCon{ab, at} WCon{bb, bt}:
          WCon{Bool.or(ab, bb), Word.or(p, at, bt)}

def Word.xor(n: Nat, a: Word(n), b: Word(n)) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match a b:
        case WCon{ab, at} WCon{bb, bt}:
          WCon{Bool.xor(ab, bb), Word.xor(p, at, bt)}

def Word.shl.put(n: Nat, c: Bool, w: Word(n)) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match w:
        case WCon{b, t}:
          WCon{c, Word.shl.put(p, b, t)}

def Word.shl(n: Nat, w: Word(n)) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match w:
        case WCon{b, t}:
          WCon{False{}, Word.shl.put(p, b, t)}

def Word.shl.out.con(-p: Nat, c: Bool, r: Bool & Word(p)) -> Bool & Word(1n+p):
  (hi, t2) = r
  (hi, WCon{c, t2})

def Word.shl.out(n: Nat, c: Bool, w: Word(n)) -> Bool & Word(n):
  match n:
    case 0n:
      (c, WNil{})
    case 1n+p:
      match w:
        case WCon{b, t}:
          Word.shl.out.con(p, c, Word.shl.out(p, b, t))

def Word.shr.pad(n: Nat, w: Word(n)) -> Word(1n+n):
  match n:
    case 0n:
      WCon{False{}, w}
    case 1n+p:
      match w:
        case WCon{b, t}:
          WCon{b, Word.shr.pad(p, t)}

def Word.shr(n: Nat, w: Word(n)) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match w:
        case WCon{b, t}:
          Word.shr.pad(p, t)

def Word.cmp.fin(ab: Bool, bb: Bool, t: Cmp) -> Cmp:
  match t:
    case LT{}:
      LT{}
    case EQ{}:
      Bool.cmp(ab, bb)
    case GT{}:
      GT{}

def Word.cmp(n: Nat, a: Word(n), b: Word(n)) -> Cmp:
  match n:
    case 0n:
      EQ{}
    case 1n+p:
      match a b:
        case WCon{ab, at} WCon{bb, bt}:
          Word.cmp.fin(ab, bb, Word.cmp(p, at, bt))

def Word.inc(n: Nat, w: Word(n)) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match w:
        case WCon{False{}, t}:
          WCon{True{}, t}
        case WCon{True{}, t}:
          WCon{False{}, Word.inc(p, t)}

law Word.adc:
  for n: Nat
  for a: Word(n)
  for b: Word(n)
  for f: Bool
  for c: Bool
  Word(n)

def Word.adc.con(p: Nat, at: Word(p), bt: Word(p), f: Bool, sk: Bool & Bool) ->
  Word(1n+p):
  (s, k) = sk
  WCon{s, Word.adc(p, at, bt, f, k)}

def Word.adc(n, a, b, f, c):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      match a b f:
        case WCon{ab, at} WCon{bb, bt} False{}:
          Word.adc.con(p, at, bt, False{}, Bool.full_add(ab, bb, c))
        case WCon{ab, at} WCon{bb, bt} True{}:
          Word.adc.con(p, at, bt, True{}, Bool.full_add(ab, Bool.not(bb), c))

def Word.add(n: Nat, a: Word(n), b: Word(n)) -> Word(n):
  Word.adc(n, a, b, False{}, False{})

def Word.sub(n: Nat, a: Word(n), b: Word(n)) -> Word(n):
  Word.adc(n, a, b, True{}, True{})

law Word.add_comm.arm:
  for p  : Nat
  for -h : Bool
  for at : Word(p)
  for bt : Word(p)
  for k  : Bool
  {WCon{h, Word.adc(p, at, bt, False{}, k)}
    == WCon{h, Word.adc(p, bt, at, False{}, k)} : Word.Con<p>}

law Word.add_comm.go:
  for n: Nat
  for a: Word(n)
  for b: Word(n)
  for c: Bool
  {Word.adc(n, a, b, False{}, c) == Word.adc(n, b, a, False{}, c) : Word(n)}

def Word.add_comm.arm(p, h, at, bt, k):
  Equal.cong(Word(p), Word(1n+p), w => WCon{h, w},
    Word.adc(p, at, bt, False{}, k), Word.adc(p, bt, at, False{}, k),
    Word.add_comm.go(p, at, bt, k))

def Word.add_comm.go(n, a, b, c):
  match n:
    case 0n:
      match a b:
        case WNil{} WNil{}:
          {==}
    case 1n+p:
      match a b c:
        case WCon{False{}, at} WCon{False{}, bt} False{}:
          Word.add_comm.arm(p, False{}, at, bt, False{})
        case WCon{False{}, at} WCon{False{}, bt} True{}:
          Word.add_comm.arm(p, True{}, at, bt, False{})
        case WCon{False{}, at} WCon{True{}, bt} False{}:
          Word.add_comm.arm(p, True{}, at, bt, False{})
        case WCon{False{}, at} WCon{True{}, bt} True{}:
          Word.add_comm.arm(p, False{}, at, bt, True{})
        case WCon{True{}, at} WCon{False{}, bt} False{}:
          Word.add_comm.arm(p, True{}, at, bt, False{})
        case WCon{True{}, at} WCon{False{}, bt} True{}:
          Word.add_comm.arm(p, False{}, at, bt, True{})
        case WCon{True{}, at} WCon{True{}, bt} False{}:
          Word.add_comm.arm(p, False{}, at, bt, True{})
        case WCon{True{}, at} WCon{True{}, bt} True{}:
          Word.add_comm.arm(p, True{}, at, bt, True{})

law Word.add_comm:
  for n: Nat
  for a: Word(n)
  for b: Word(n)
  {Word.add(n, a, b) == Word.add(n, b, a) : Word(n)}

def Word.add_comm(n, a, b):
  Word.add_comm.go(n, a, b, False{})

def Word.to_nat(n: Nat, w: Word(n)) -> Nat:
  match n:
    case 0n:
      0n
    case 1n+p:
      match w:
        case WCon{False{}, t}:
          Nat.double(Word.to_nat(p, t))
        case WCon{True{}, t}:
          1n+Nat.double(Word.to_nat(p, t))

def Word.mul.go(+n: Nat, m: Nat, a: Word(m), +b: Word(n), acc: Word(n)) ->
  Word(n):
  match m:
    case 0n:
      acc
    case 1n+mp:
      match a:
        case WCon{False{}, at}:
          Word.mul.go(n, mp, at, Word.shl(n, b), acc)
        case WCon{True{}, at}:
          Word.mul.go(n, mp, at, Word.shl(n, b), Word.add(n, acc, b))

def Word.mul(+n: Nat, a: Word(n), b: Word(n)) -> Word(n):
  Word.mul.go(n, n, a, b, Word.zero(n))

# U32
# ---

def U32.inc(a: U32) -> U32:
  match a:
    case U32{x}:
      U32{Word.inc(32n, x)}

def U32.add(a: U32, b: U32) -> U32:
  match a b:
    case U32{x} U32{y}:
      U32{Word.add(32n, x, y)}

law U32.add_comm:
  for a: U32
  for b: U32
  {U32.add(a, b) == U32.add(b, a) : U32}

def U32.add_comm(a, b):
  match a b:
    case U32{x} U32{y}:
      Equal.cong(Word(32n), U32, w => U32{w}, Word.add(32n, x, y),
        Word.add(32n, y, x), Word.add_comm(32n, x, y))

def U32.sub(a: U32, b: U32) -> U32:
  match a b:
    case U32{x} U32{y}:
      U32{Word.sub(32n, x, y)}

def U32.mul(a: U32, b: U32) -> U32:
  match a b:
    case U32{x} U32{y}:
      U32{Word.mul(32n, x, y)}

def U32.not(a: U32) -> U32:
  match a:
    case U32{x}:
      U32{Word.not(32n, x)}

def U32.and(a: U32, b: U32) -> U32:
  match a b:
    case U32{x} U32{y}:
      U32{Word.and(32n, x, y)}

def U32.or(a: U32, b: U32) -> U32:
  match a b:
    case U32{x} U32{y}:
      U32{Word.or(32n, x, y)}

def U32.xor(a: U32, b: U32) -> U32:
  match a b:
    case U32{x} U32{y}:
      U32{Word.xor(32n, x, y)}

def U32.shl(a: U32) -> U32:
  match a:
    case U32{x}:
      U32{Word.shl(32n, x)}

def U32.shr(a: U32) -> U32:
  match a:
    case U32{x}:
      U32{Word.shr(32n, x)}

def U32.shln(a: U32, n: Nat) -> U32:
  match n:
    case 0n:
      a
    case 1n+p:
      U32.shl(U32.shln(a, p))

def U32.shrn(a: U32, n: Nat) -> U32:
  match n:
    case 0n:
      a
    case 1n+p:
      U32.shr(U32.shrn(a, p))

def U32.cmp(a: U32, b: U32) -> Cmp:
  match a b:
    case U32{x} U32{y}:
      Word.cmp(32n, x, y)

def U32.is_eq(a: U32, b: U32) -> Bool:
  Cmp.is_eq(U32.cmp(a, b))

def U32.is_ne(a: U32, b: U32) -> Bool:
  Bool.not(Cmp.is_eq(U32.cmp(a, b)))

def U32.is_lt(a: U32, b: U32) -> Bool:
  Cmp.is_lt(U32.cmp(a, b))

def U32.is_le(a: U32, b: U32) -> Bool:
  Cmp.is_le(U32.cmp(a, b))

def U32.is_gt(a: U32, b: U32) -> Bool:
  Cmp.is_gt(U32.cmp(a, b))

def U32.is_ge(a: U32, b: U32) -> Bool:
  Cmp.is_ge(U32.cmp(a, b))

def U32.is_zero(a: U32) -> Bool:
  U32.is_eq(a, 0)

def U32.to_nat(a: U32) -> Nat:
  match a:
    case U32{w}:
      Word.to_nat(32n, w)

def U32.from_nat(n: Nat) -> U32:
  match n:
    case 0n:
      0
    case 1n+p:
      U32.inc(U32.from_nat(p))

def U32.divmod.go.fin(-p: Nat, q: Word(p), s: U32, b: U32, g: Bool) ->
  Word(1n+p) & U32:
  match g:
    case True{}:
      (WCon{True{}, q}, U32.sub(s, b))
    case False{}:
      (WCon{False{}, q}, s)

def U32.divmod.go.shl(-p: Nat, q: Word(p), +b: U32, ts: Bool & Word(32n)) ->
  Word(1n+p) & U32:
  (t, s) = ts
  +s2 = {U32{s} : U32}
  U32.divmod.go.fin(p, q, s2, b, Bool.or(t, U32.is_ge(s2, b)))

def U32.divmod.go.rec(-p: Nat, a0: Bool, +b: U32, qr: Word(p) & U32) ->
  Word(1n+p) & U32:
  (q, r) = qr
  U32{rw} = r
  U32.divmod.go.shl(p, q, b, Word.shl.out(32n, a0, rw))

def U32.divmod.go(m: Nat, a: Word(m), +b: U32) -> Word(m) & U32:
  match m a:
    case 0n WNil{}:
      (WNil{}, 0)
    case 1n+p WCon{a0, hi}:
      U32.divmod.go.rec(p, a0, b, U32.divmod.go(p, hi, b))

def U32.div.fin(qr: Word(32n) & U32) -> U32:
  (q, r) = qr
  U32{q}

def U32.div.if(aw: Word(32n), b: U32, z: Bool) -> U32:
  match z:
    case True{}:
      0
    case False{}:
      U32.div.fin(U32.divmod.go(32n, aw, b))

def U32.div(a: U32, +b: U32) -> U32:
  U32{aw} = a
  U32.div.if(aw, b, U32.is_zero(b))

def U32.mod.fin(qr: Word(32n) & U32) -> U32:
  (q, r) = qr
  r

def U32.mod.if(aw: Word(32n), b: U32, z: Bool) -> U32:
  match z:
    case True{}:
      U32{aw}
    case False{}:
      U32.mod.fin(U32.divmod.go(32n, aw, b))

def U32.mod(a: U32, +b: U32) -> U32:
  U32{aw} = a
  U32.mod.if(aw, b, U32.is_zero(b))

def U32.min(+a: U32, +b: U32) -> U32:
  Bool.pick(U32, U32.is_lt(a, b), a, b)

def U32.max(+a: U32, +b: U32) -> U32:
  Bool.pick(U32, U32.is_lt(a, b), b, a)

def U32.clamp(x: U32, lo: U32, hi: U32) -> U32:
  U32.min(U32.max(x, lo), hi)

def U32.pow(+a: U32, n: Nat) -> U32:
  match n:
    case 0n:
      1
    case 1n+p:
      U32.mul(a, U32.pow(a, p))

def U32.is_even(a: U32) -> Bool:
  U32.is_zero(U32.and(a, 1))

# F32
# ---

law U32.to_f32:
  for a: U32
  F32

law F32.to_u32:
  for a: F32
  U32

law F32.add:
  for a: F32
  for b: F32
  F32

law F32.sub:
  for a: F32
  for b: F32
  F32

law F32.mul:
  for a: F32
  for b: F32
  F32

law F32.div:
  for a: F32
  for b: F32
  F32

law F32.mod:
  for a: F32
  for b: F32
  F32

law F32.pow:
  for a: F32
  for b: F32
  F32

law F32.atan2:
  for a: F32
  for b: F32
  F32

law F32.neg:
  for a: F32
  F32

law F32.abs:
  for a: F32
  F32

law F32.sqrt:
  for a: F32
  F32

law F32.exp:
  for a: F32
  F32

law F32.log:
  for a: F32
  F32

law F32.log2:
  for a: F32
  F32

law F32.log10:
  for a: F32
  F32

law F32.sin:
  for a: F32
  F32

law F32.cos:
  for a: F32
  F32

law F32.tan:
  for a: F32
  F32

law F32.asin:
  for a: F32
  F32

law F32.acos:
  for a: F32
  F32

law F32.atan:
  for a: F32
  F32

law F32.sinh:
  for a: F32
  F32

law F32.cosh:
  for a: F32
  F32

law F32.tanh:
  for a: F32
  F32

law F32.floor:
  for a: F32
  F32

law F32.ceil:
  for a: F32
  F32

law F32.trunc:
  for a: F32
  F32

law F32.is_eq:
  for a: F32
  for b: F32
  Bool

law F32.is_ne:
  for a: F32
  for b: F32
  Bool

law F32.is_lt:
  for a: F32
  for b: F32
  Bool

law F32.is_le:
  for a: F32
  for b: F32
  Bool

law F32.is_gt:
  for a: F32
  for b: F32
  Bool

law F32.is_ge:
  for a: F32
  for b: F32
  Bool

law F32.show:
  for +a: F32
  String

law F32.bits:
  for a: F32
  U32

law F32.read:
  for s: String
  Maybe<&2, F32>

def F32.min(+a: F32, +b: F32) -> F32:
  Bool.pick(F32, F32.is_lt(a, b), a, b)

def F32.max(+a: F32, +b: F32) -> F32:
  Bool.pick(F32, F32.is_lt(a, b), b, a)

def F32.clamp(x: F32, lo: F32, hi: F32) -> F32:
  F32.min(F32.max(x, lo), hi)

def F32.lerp(+a: F32, b: F32, t: F32) -> F32:
  F32.add(a, F32.mul(F32.sub(b, a), t))

def F32.square(+a: F32) -> F32:
  F32.mul(a, a)

def F32.hypot(+x: F32, +y: F32) -> F32:
  F32.sqrt(F32.add(F32.mul(x, x), F32.mul(y, y)))

def F32.round(a: F32) -> F32:
  F32.floor(F32.add(a, 0.5))

def F32.pi() -> F32:
  3.14159265

def F32.from_nat(n: Nat) -> F32:
  U32.to_f32(U32.from_nat(n))

def F32.to_nat(a: F32) -> Nat:
  U32.to_nat(F32.to_u32(a))

# Char
# ----

def Char.cmp(a: Char, b: Char) -> (Char & Char) & Cmp:
  match a b:
    case Chr{+x} Chr{+y}:
      ((Chr{x}, Chr{y}), U32.cmp(x, y))

def Char.to_u32(c: Char) -> U32:
  match c:
    case Chr{x}:
      x

def Char.from_u32(x: U32) -> Char:
  Chr{x}

def Char.is_eq(a: Char, b: Char) -> Bool:
  match a b:
    case Chr{x} Chr{y}:
      U32.is_eq(x, y)

def Char.is_digit(c: Char) -> Bool:
  match c:
    case Chr{+x}:
      Bool.and(U32.is_ge(x, 48), U32.is_le(x, 57))

def Char.is_upper(c: Char) -> Bool:
  match c:
    case Chr{+x}:
      Bool.and(U32.is_ge(x, 65), U32.is_le(x, 90))

def Char.is_lower(c: Char) -> Bool:
  match c:
    case Chr{+x}:
      Bool.and(U32.is_ge(x, 97), U32.is_le(x, 122))

def Char.is_alpha(+c: Char) -> Bool:
  Bool.or(Char.is_upper(c), Char.is_lower(c))

def Char.is_space(c: Char) -> Bool:
  match c:
    case Chr{+x}:
      Bool.or(U32.is_eq(x, 32), Bool.and(U32.is_ge(x, 9), U32.is_le(x, 13)))

def Char.to_upper(+c: Char) -> Char:
  Chr{U32.sub(Char.to_u32(c), U32.mul(Bool.to_u32(Char.is_lower(c)), 32))}

def Char.to_lower(+c: Char) -> Char:
  Chr{U32.add(Char.to_u32(c), U32.mul(Bool.to_u32(Char.is_upper(c)), 32))}

# String
# ------

def String.append(a: String, b: String) -> String:
  match a:
    case SNil{}:
      b
    case SCon{h, t}:
      SCon{h, String.append(t, b)}

def String.cmp.rec(h1b: Char, h2b: Char, rr: (String & String) & Cmp) ->
  (String & String) & Cmp:
  ((t1b, t2b), r) = rr
  ((SCon{h1b, t1b}, SCon{h2b, t2b}), r)

law String.cmp:
  for a: String
  for b: String
  (String & String) & Cmp

def String.cmp.fin(t1: String, t2: String, hc: (Char & Char) & Cmp) ->
  (String & String) & Cmp:
  ((h1b, h2b), c) = hc
  match c:
    case LT{}:
      ((SCon{h1b, t1}, SCon{h2b, t2}), LT{})
    case EQ{}:
      String.cmp.rec(h1b, h2b, String.cmp(t1, t2))
    case GT{}:
      ((SCon{h1b, t1}, SCon{h2b, t2}), GT{})

def String.cmp(a, b):
  match a b:
    case SNil{} SNil{}:
      ((SNil{}, SNil{}), EQ{})
    case SNil{} SCon{h, t}:
      ((SNil{}, SCon{h, t}), LT{})
    case SCon{h, t} SNil{}:
      ((SCon{h, t}, SNil{}), GT{})
    case SCon{h1, t1} SCon{h2, t2}:
      String.cmp.fin(t1, t2, Char.cmp(h1, h2))

def String.eq.fin(r: (String & String) & Cmp) -> Bool:
  ((a2, b2), c) = r
  Cmp.is_eq(c)

def String.eq(a: String, b: String) -> Bool:
  String.eq.fin(String.cmp(a, b))

def String.length(s: String) -> Nat:
  match s:
    case SNil{}:
      0n
    case SCon{h, t}:
      1n+String.length(t)

def String.is_empty(s: String) -> Bool:
  match s:
    case SNil{}:
      True{}
    case SCon{h, t}:
      False{}

def String.reverse.go(s: String, acc: String) -> String:
  match s:
    case SNil{}:
      acc
    case SCon{h, t}:
      String.reverse.go(t, SCon{h, acc})

def String.reverse(s: String) -> String:
  String.reverse.go(s, SNil{})

def String.order.fin(r: (String & String) & Cmp) -> Cmp:
  (ab, c) = r
  c

def String.order(a: String, b: String) -> Cmp:
  String.order.fin(String.cmp(a, b))

def String.is_lt(a: String, b: String) -> Bool:
  Cmp.is_lt(String.order(a, b))

def String.is_le(a: String, b: String) -> Bool:
  Cmp.is_le(String.order(a, b))

def String.is_gt(a: String, b: String) -> Bool:
  Cmp.is_gt(String.order(a, b))

def String.is_ge(a: String, b: String) -> Bool:
  Cmp.is_ge(String.order(a, b))

law String.starts_with:
  for s: String
  for p: String
  Bool

def String.starts_with.if(t: String, pt: String, same: Bool) -> Bool:
  match same:
    case False{}:
      False{}
    case True{}:
      String.starts_with(t, pt)

def String.starts_with(s, p):
  match s p:
    case SNil{} SNil{}:
      True{}
    case SNil{} SCon{h, t}:
      False{}
    case SCon{h, t} SNil{}:
      True{}
    case SCon{x, xt} SCon{y, yt}:
      String.starts_with.if(xt, yt, Char.is_eq(x, y))

def String.ends_with(s: String, p: String) -> Bool:
  String.starts_with(String.reverse(s), String.reverse(p))

law String.contains:
  for +s: String
  for +p: String
  Bool

def String.contains.if(t: String, p: String, here: Bool) -> Bool:
  match here:
    case False{}:
      String.contains(t, p)
    case True{}:
      True{}

def String.contains(s, p):
  match s:
    case SNil{}:
      String.is_empty(p)
    case SCon{h, t}:
      String.contains.if(t, p, String.starts_with(SCon{h, t}, p))

def String.take(s: String, n: Nat) -> String:
  match s n:
    case SNil{} _:
      SNil{}
    case SCon{h, t} 0n:
      SNil{}
    case SCon{h, t} 1n+p:
      SCon{h, String.take(t, p)}

def String.drop(s: String, n: Nat) -> String:
  match s n:
    case SNil{} _:
      SNil{}
    case SCon{h, t} 0n:
      SCon{h, t}
    case SCon{h, t} 1n+p:
      String.drop(t, p)

def String.get(s: String, n: Nat) -> Maybe<&2, Char>:
  match s n:
    case SNil{} _:
      None{}
    case SCon{h, t} 0n:
      Some{h}
    case SCon{h, t} 1n+p:
      String.get(t, p)

def String.to_list(s: String) -> List<&2, Char>:
  match s:
    case SNil{}:
      Nil{}
    case SCon{h, t}:
      h <> String.to_list(t)

def String.from_list(cs: List<&2, Char>) -> String:
  match cs:
    case Nil{}:
      SNil{}
    case h <> t:
      SCon{h, String.from_list(t)}

def String.concat(xs: List<&2, String>) -> String:
  match xs:
    case Nil{}:
      SNil{}
    case h <> t:
      String.append(h, String.concat(t))

def String.join.go(xs: List<&2, String>, h: String, +sep: String) -> String:
  match xs:
    case Nil{}:
      h
    case h2 <> t:
      String.append(h, String.append(sep, String.join.go(t, h2, sep)))

def String.join(xs: List<&2, String>, +sep: String) -> String:
  match xs:
    case Nil{}:
      SNil{}
    case h <> t:
      String.join.go(t, h, sep)

def String.split.push(c: Char, ps: List<&2, String>) -> List<&2, String>:
  match ps:
    case Nil{}:
      [SCon{c, SNil{}}]
    case h <> t:
      SCon{c, h} <> t

def String.split.fin(c: Char, r: List<&2, String>, cut: Bool) ->
  List<&2, String>:
  match cut:
    case False{}:
      String.split.push(c, r)
    case True{}:
      SNil{} <> r

def String.split(s: String, +sep: Char) -> List<&2, String>:
  match s:
    case SNil{}:
      [SNil{}]
    case SCon{+h, t}:
      String.split.fin(h, String.split(t, sep), Char.is_eq(h, sep))

def String.lines(s: String) -> List<&2, String>:
  String.split(s, '\\n')

def String.repeat(+s: String, n: Nat) -> String:
  match n:
    case 0n:
      SNil{}
    case 1n+p:
      String.append(s, String.repeat(s, p))

def String.to_upper(s: String) -> String:
  match s:
    case SNil{}:
      SNil{}
    case SCon{h, t}:
      SCon{Char.to_upper(h), String.to_upper(t)}

def String.to_lower(s: String) -> String:
  match s:
    case SNil{}:
      SNil{}
    case SCon{h, t}:
      SCon{Char.to_lower(h), String.to_lower(t)}

law String.trim_start:
  for s: String
  String

def String.trim_start.if(h: Char, t: String, space: Bool) -> String:
  match space:
    case False{}:
      SCon{h, t}
    case True{}:
      String.trim_start(t)

def String.trim_start(s):
  match s:
    case SNil{}:
      SNil{}
    case SCon{+h, t}:
      String.trim_start.if(h, t, Char.is_space(h))

def String.trim_end(s: String) -> String:
  String.reverse(String.trim_start(String.reverse(s)))

def String.trim(s: String) -> String:
  String.trim_end(String.trim_start(s))

# Text
# ----

def Nat.show.put(qr: Nat & Nat) -> Char & Nat:
  (q, r) = qr
  (Chr{U32.from_nat(Nat.add(48n, r))}, q)

law Nat.show.go:
  for f   : Nat
  for n   : Nat
  for acc : String
  String

def Nat.show.fin(g: Nat, acc: String, dq: Char & Nat) -> String:
  (d, q) = dq
  match q:
    case 0n:
      SCon{d, acc}
    case 1n+p:
      Nat.show.go(g, 1n+p, SCon{d, acc})

def Nat.show.go(f, n, acc):
  match f:
    case 0n:
      acc
    case 1n+g:
      Nat.show.fin(g, acc, Nat.show.put(Nat.divmod(n, 10n)))

def Nat.show(n: Nat) -> String:
  +m = n
  Nat.show.fin(m, SNil{}, Nat.show.put(Nat.divmod(m, 10n)))

law Nat.read.go:
  for s   : String
  for +acc : Nat
  Maybe<&2, Nat>

def Nat.read.max() -> Nat:
  Nat.mul(U32.to_nat(16777215), U32.to_nat(16777217))

def Nat.read.fit(acc: Nat, qr: Nat & Nat) -> Bool:
  (q, r) = qr
  Bool.not(Nat.is_lt(q, acc))

def Nat.read.if(t: String, acc: Nat, d: U32, ok: Bool) -> Maybe<&2, Nat>:
  match ok:
    case True{}:
      Nat.read.go(t, Nat.add(Nat.mul(acc, 10n), U32.to_nat(d)))
    case False{}:
      None{}

def Nat.read.go(s, acc):
  match s:
    case SNil{}:
      Some{acc}
    case SCon{Chr{x}, t}:
      +d = U32.sub(x, 48)
      Nat.read.if(t, acc, d, Bool.and(U32.is_lt(d, 10), Nat.read.fit(acc,
        Nat.divmod(Nat.sub(Nat.read.max(), U32.to_nat(d)), 10n))))

def Nat.read(s: String) -> Maybe<&2, Nat>:
  match s:
    case SNil{}:
      None{}
    case SCon{h, t}:
      Nat.read.go(SCon{h, t}, 0n)

law U32.show.go:
  for f   : Nat
  for +n  : U32
  for acc : String
  String

def U32.show.fin(g: Nat, acc: String, +n: U32, z: Bool) -> String:
  match z:
    case True{}:
      acc
    case False{}:
      U32.show.go(g, U32.div(n, 10),
        SCon{Chr{U32.add(48, U32.mod(n, 10))}, acc})

def U32.show.go(f, n, acc):
  match f:
    case 0n:
      acc
    case 1n+g:
      U32.show.fin(g, acc, n, U32.is_zero(n))

def U32.show.if(a: U32, z: Bool) -> String:
  match z:
    case True{}:
      SCon{Chr{48}, SNil{}}
    case False{}:
      U32.show.go(10n, a, SNil{})

def U32.show(a: U32) -> String:
  +b = a
  U32.show.if(b, U32.is_zero(b))

law U32.read.go:
  for s   : String
  for +acc : U32
  Maybe<&2, U32>

def U32.read.if(t: String, n: U32, ok: Bool) -> Maybe<&2, U32>:
  match ok:
    case True{}:
      U32.read.go(t, n)
    case False{}:
      None{}

def U32.read.go(s, acc):
  match s:
    case SNil{}:
      Some{acc}
    case SCon{Chr{x}, t}:
      +n = U32.add(U32.mul(acc, 10), U32.sub(x, 48))
      U32.read.if(t, n, U32.is_eq(U32.div(n, 10), acc))

def U32.read(s: String) -> Maybe<&2, U32>:
  match s:
    case SNil{}:
      None{}
    case SCon{h, t}:
      U32.read.go(SCon{h, t}, 0)

def Bool.show(b: Bool) -> String:
  match b:
    case False{}:
      "False"
    case True{}:
      "True"

def Char.show(c: Char) -> String:
  SCon{c, SNil{}}

def Maybe.show(~a: Quant, ~A: Kind(a), ~f: A -> String, m: Maybe<a, A>) ->
  String:
  match m:
    case None{}:
      "None"
    case Some{x}:
      "Some(" ++ f(x) ++ ")"

def List.show.go(~a: Quant, ~A: Kind(a), ~f: A -> String, xs: List<a, A>) ->
  String:
  match xs:
    case Nil{}:
      "]"
    case h <> t:
      ", " ++ f(h) ++ List.show.go(~a, ~A, ~f, t)

def List.show(~a: Quant, ~A: Kind(a), ~f: A -> String, xs: List<a, A>) ->
  String:
  match xs:
    case Nil{}:
      "[]"
    case h <> t:
      "[" ++ f(h) ++ List.show.go(~a, ~A, ~f, t)

# Array
# -----

def Array.size.node(-T: Type, ys: Array<T>, r: Array<T> & U32) ->
  Array<T> & U32:
  (xs2, n) = r
  (ANode{xs2, ys}, U32.shl(n))

def Array.size(-T: Type, a: Array<T>) -> Array<T> & U32:
  match a:
    case ALeaf{x}:
      (ALeaf{x}, 1)
    case ANode{xs, ys}:
      Array.size.node(T, ys, Array.size(T, xs))

def Array.swap.lo(-T: Type, ys: Array<T>, r: Array<T> & T) -> Array<T> & T:
  (nxs, old) = r
  (ANode{nxs, ys}, old)

def Array.swap.hi(-T: Type, xs: Array<T>, r: Array<T> & T) -> Array<T> & T:
  (nys, old) = r
  (ANode{xs, nys}, old)

law Array.swap.go:
  for -T: Type
  for  a: Array<T>
  for  n: U32
  for +i: U32
  for  v: T
  Array<T> & T

def Array.swap.if(
  -T: Type, xs: Array<T>, ys: Array<T>, +h: U32, i: U32, v: T, z: Bool
) -> Array<T> & T:
  match z:
    case True{}:
      Array.swap.lo(T, ys, Array.swap.go(T, xs, h, i, v))
    case False{}:
      Array.swap.hi(T, xs, Array.swap.go(T, ys, h, U32.sub(i, h), v))

def Array.swap.go(T, a, n, i, v):
  match a:
    case ALeaf{x}:
      (ALeaf{v}, x)
    case ANode{xs, ys}:
      +h = U32.shr(n)
      Array.swap.if(T, xs, ys, h, i, v, U32.is_lt(i, h))

def Array.swap.at(-T: Type, i: U32, v: T, an: Array<T> & U32) -> Array<T> & T:
  (a, +n) = an
  Array.swap.go(T, a, n, U32.and(i, U32.sub(n, 1)), v)

def Array.swap(-T: Type, a: Array<T>, +i: U32, v: T) -> Array<T> & T:
  Array.swap.at(T, i, v, Array.size(T, a))

def Array.clone.node(
  -T: Data, cx: Array<T> & Array<T>, cy: Array<T> & Array<T>
) -> Array<T> & Array<T>:
  (xa, xb) = cx
  (ya, yb) = cy
  (ANode{xa, ya}, ANode{xb, yb})

def Array.clone(-T: Data, a: Array<T>) -> Array<T> & Array<T>:
  match a:
    case ALeaf{+x}:
      (ALeaf{x}, ALeaf{x})
    case ANode{xs, ys}:
      Array.clone.node(T, Array.clone(T, xs), Array.clone(T, ys))

def Array.new(-T: Data, +d: Nat, +v: T) -> Array<T>:
  match d:
    case 0n:
      ALeaf{v}
    case 1n+p:
      ANode{[v : T^p], [v : T^p]}

def Array.set.fin(-T: Type, r: Array<T> & T) -> Array<T>:
  (na, old) = r
  na

def Array.set(-T: Type, a: Array<T>, i: U32, v: T) -> Array<T>:
  Array.set.fin(T, Array.swap(T, a, i, v))

law Array.get.go:
  for -T: Data
  for  a: Array<T>
  for  n: U32
  for +i: U32
  Array<T> & T

def Array.get.if(
  -T: Data, xs: Array<T>, ys: Array<T>, +h: U32, i: U32, z: Bool
) -> Array<T> & T:
  match z:
    case True{}:
      Array.swap.lo(T, ys, Array.get.go(T, xs, h, i))
    case False{}:
      Array.swap.hi(T, xs, Array.get.go(T, ys, h, U32.sub(i, h)))

def Array.get.go(T, a, n, i):
  match a:
    case ALeaf{+x}:
      (ALeaf{x}, x)
    case ANode{xs, ys}:
      +h = U32.shr(n)
      Array.get.if(T, xs, ys, h, i, U32.is_lt(i, h))

def Array.get.at(-T: Data, i: U32, an: Array<T> & U32) -> Array<T> & T:
  (a, +n) = an
  Array.get.go(T, a, n, U32.and(i, U32.sub(n, 1)))

def Array.get(-T: Data, a: Array<T>, +i: U32) -> Array<T> & T:
  Array.get.at(T, i, Array.size(T, a))

def Array.to_list.go(~T: Type, a: Array<T>, acc: List<T>) -> List<T>:
  match a:
    case ALeaf{x}:
      x <> acc
    case ANode{xs, ys}:
      Array.to_list.go(~T, xs, Array.to_list.go(~T, ys, acc))

def Array.to_list(~T: Type, a: Array<T>) -> List<T>:
  Array.to_list.go(~T, a, Nil{})

def Array.map(~T: Type, ~U: Type, ~f: T -> U, a: Array<T>) -> Array<U>:
  match a:
    case ALeaf{x}:
      ALeaf{f(x)}
    case ANode{xs, ys}:
      l r = Array.map(~T, ~U, ~f, xs) Array.map(~T, ~U, ~f, ys)
      ANode{l, r}

# Map
# ---

def Map.bit.u(x: U32, k: Nat) -> Bool:
  U32.is_ne(U32.and(U32.shrn(x, k), 1), 0)

def Map.bit.chr(c: Char, off: Nat) -> Char & Bool:
  match c off:
    case Chr{x} 0n:
      (Chr{x}, True{})
    case Chr{+x} 1n+b:
      (Chr{x}, Map.bit.u(x, Nat.sub(31n, b)))

def Map.bit.go.chr(t: String, r: Char & Bool) -> String & Bool:
  (c2, b) = r
  (SCon{c2, t}, b)

def Map.bit.go.rec(c: Char, r: String & Bool) -> String & Bool:
  (t2, b) = r
  (SCon{c, t2}, b)

def Map.bit.go(key: String, ci: Nat, off: Nat) -> String & Bool:
  match key:
    case SNil{}:
      (SNil{}, False{})
    case SCon{c, t}:
      match ci:
        case 0n:
          Map.bit.go.chr(t, Map.bit.chr(c, off))
        case 1n+j:
          Map.bit.go.rec(c, Map.bit.go(t, j, off))

def Map.bit.at(key: String, co: Nat & Nat) -> String & Bool:
  (ci, off) = co
  Map.bit.go(key, ci, off)

def Map.bit(key: String, pos: Nat) -> String & Bool:
  Map.bit.at(key, Nat.divmod(pos, 33n))

law Map.msb.u:
  for n: Nat
  for +x: U32
  Nat

def Map.msb.u.if(p: Nat, x2: U32, z: Bool) -> Nat:
  match z:
    case True{}:
      0n
    case False{}:
      Nat.add(1n, Map.msb.u(p, U32.shr(x2)))

def Map.msb.u(n, x):
  match n:
    case 0n:
      0n
    case 1n+p:
      Map.msb.u.if(p, x, U32.is_zero(x))

def Map.diff.chr(x: U32) -> Nat:
  Nat.sub(33n, Map.msb.u(32n, x))

def Map.diff.step(x: Char, y: Char) -> Nat & Bool:
  match x y:
    case Chr{+cx} Chr{+cy}:
      (Map.diff.chr(U32.xor(cx, cy)), U32.is_eq(cx, cy))

law Map.diff:
  for a: String
  for b: String
  Nat

def Map.diff.fin(xt: String, yt: String, rc: Nat & Bool) -> Nat:
  (r, c) = rc
  match c:
    case True{}:
      Nat.add(33n, Map.diff(xt, yt))
    case False{}:
      r

def Map.diff(a, b):
  match a b:
    case SNil{} SNil{}:
      0n
    case SNil{} SCon{h, t}:
      0n
    case SCon{h, t} SNil{}:
      0n
    case SCon{x, xt} SCon{y, yt}:
      Map.diff.fin(xt, yt, Map.diff.step(x, y))

def Map.new(a, -V: Kind(a)) -> Map<a, V>:
  MTip{}

law Map.put:
  for -a  : Quant
  for -V  : Kind(a)
  for m   : Map<a, V>
  for key : String
  for x   : V
  Map<a, V>

def Map.put.bit(
  a, -V: Kind(a), x: V, p2: Nat, lo: Map<a, V>, hi: Map<a, V>, kb: String & Bool
) -> Map<a, V>:
  (key2, b) = kb
  match b:
    case False{}:
      MNode{p2, Map.put(a, V, lo, key2, x), hi}
    case True{}:
      MNode{p2, lo, Map.put(a, V, hi, key2, x)}

def Map.put(a, V, m, key, x):
  match m:
    case MTip{}:
      MLeaf{key, x}
    case MLeaf{k, v}:
      MLeaf{k, x}
    case MNode{+pos, lo, hi}:
      Map.put.bit(a, V, x, pos, lo, hi, Map.bit(key, pos))

def Map.ins.splice.bit(
  a, -V: Kind(a), x: V, rest: Map<a, V>, pb: Nat, kb: String & Bool
) -> Map<a, V>:
  (key2, b) = kb
  match b:
    case False{}:
      MNode{pb, MLeaf{key2, x}, rest}
    case True{}:
      MNode{pb, rest, MLeaf{key2, x}}

def Map.ins.splice(
  a, -V: Kind(a), +p: Nat, key: String, x: V, rest: Map<a, V>
) -> Map<a, V>:
  Map.ins.splice.bit(a, V, x, rest, p, Map.bit(key, p))

law Map.ins:
  for -a  : Quant
  for -V  : Kind(a)
  for m   : Map<a, V>
  for key : String
  for x   : V
  for +p  : Nat
  Map<a, V>

def Map.ins.deep(
  a, -V: Kind(a), x: V, lo: Map<a, V>, hi: Map<a, V>, pb: Nat, qb: Nat,
  kb: String & Bool
) -> Map<a, V>:
  (key2, b) = kb
  match b:
    case False{}:
      MNode{qb, Map.ins(a, V, lo, key2, x, pb), hi}
    case True{}:
      MNode{qb, lo, Map.ins(a, V, hi, key2, x, pb)}

def Map.ins.if(
  a, -V: Kind(a), key: String, x: V, lo: Map<a, V>, hi: Map<a, V>, +p2: Nat,
  pb: Nat, t: Bool
) -> Map<a, V>:
  match t:
    case False{}:
      Map.ins.splice(a, V, pb, key, x, MNode{p2, lo, hi})
    case True{}:
      Map.ins.deep(a, V, x, lo, hi, pb, p2, Map.bit(key, p2))

def Map.ins(a, V, m, key, x, p):
  match m:
    case MTip{}:
      MLeaf{key, x}
    case MLeaf{k, v}:
      Map.ins.splice(a, V, p, key, x, MLeaf{k, v})
    case MNode{+pos, lo, hi}:
      Map.ins.if(a, V, key, x, lo, hi, pos, p, Nat.is_lt(pos, p))

def Map.lo(
  a, -V: Kind(a), -R: Type, p2: Nat, hi: Map<a, V>, r0: Map<a, V> & R
) -> Map<a, V> & R:
  (lo2, r) = r0
  (MNode{p2, lo2, hi}, r)

def Map.hi(
  a, -V: Kind(a), -R: Type, p2: Nat, lo: Map<a, V>, r0: Map<a, V> & R
) -> Map<a, V> & R:
  (hi2, r) = r0
  (MNode{p2, lo, hi2}, r)

law Map.seek:
  for -a  : Quant
  for -V  : Kind(a)
  for m   : Map<a, V>
  for key : String
  Map<a, V> & String & Maybe<&2, String>

def Map.seek.bit(
  a, -V: Kind(a), lo: Map<a, V>, hi: Map<a, V>, p2: Nat, kb: String & Bool
) -> Map<a, V> & String & Maybe<&2, String>:
  (key2, b) = kb
  match b:
    case False{}:
      Map.lo(a, V, String & Maybe<&2, String>, p2, hi, Map.seek(a, V, lo, key2))
    case True{}:
      Map.hi(a, V, String & Maybe<&2, String>, p2, lo, Map.seek(a, V, hi, key2))

def Map.seek(a, V, m, key):
  match m:
    case MTip{}:
      (MTip{}, key, None{})
    case MLeaf{+k, v}:
      (MLeaf{k, v}, key, Some{k})
    case MNode{+pos, lo, hi}:
      Map.seek.bit(a, V, lo, hi, pos, Map.bit(key, pos))

def Map.set.fin.go(
  a, -V: Kind(a), m: Map<a, V>, key: String, x: V, r: (String & String) & Cmp
) -> Map<a, V>:
  ((keyb2, k2), c) = r
  match c:
    case LT{}:
      Map.ins(a, V, m, key, x, Map.diff(keyb2, k2))
    case EQ{}:
      Map.put(a, V, m, key, x)
    case GT{}:
      Map.ins(a, V, m, key, x, Map.diff(keyb2, k2))

def Map.set.fin(
  a, -V: Kind(a), m: Map<a, V>, key: String, x: V, keyb: String, k: String
) -> Map<a, V>:
  Map.set.fin.go(a, V, m, key, x, String.cmp(keyb, k))

def Map.set.go(
  a, -V: Kind(a), x: V, r: Map<a, V> & String & Maybe<&2, String>
) -> Map<a, V>:
  (m2, key2, found) = r
  match found:
    case None{}:
      MLeaf{key2, x}
    case Some{k}:
      +ka = {key2 : String}
      Map.set.fin(a, V, m2, ka, x, ka, k)

def Map.set(a, -V: Kind(a), m: Map<a, V>, key: String, x: V) -> Map<a, V>:
  Map.set.go(a, V, x, Map.seek(a, V, m, key))

def Map.has.leaf(a, -V: Kind(a), v: V, r: (String & String) & Cmp) ->
  Map<a, V> & Bool:
  ((key2, k2), c) = r
  (MLeaf{k2, v}, Cmp.is_eq(c))

law Map.has:
  for -a  : Quant
  for -V  : Kind(a)
  for m   : Map<a, V>
  for key : String
  Map<a, V> & Bool

def Map.has.bit(
  a, -V: Kind(a), lo: Map<a, V>, hi: Map<a, V>, p2: Nat, kb: String & Bool
) -> Map<a, V> & Bool:
  (key2, b) = kb
  match b:
    case False{}:
      Map.lo(a, V, Bool, p2, hi, Map.has(a, V, lo, key2))
    case True{}:
      Map.hi(a, V, Bool, p2, lo, Map.has(a, V, hi, key2))

def Map.has(a, V, m, key):
  match m:
    case MTip{}:
      (MTip{}, False{})
    case MLeaf{k, v}:
      Map.has.leaf(a, V, v, String.cmp(key, k))
    case MNode{+pos, lo, hi}:
      Map.has.bit(a, V, lo, hi, pos, Map.bit(key, pos))

def Map.get.leaf(-V: Data, d: V, +v: V, r: (String & String) & Cmp) ->
  Map<&2, V> & V:
  ((key2, k2), c) = r
  match c:
    case LT{}:
      (MLeaf{k2, v}, d)
    case EQ{}:
      (MLeaf{k2, v}, v)
    case GT{}:
      (MLeaf{k2, v}, d)

law Map.get:
  for -V  : Data
  for d   : V
  for m   : Map<&2, V>
  for key : String
  Map<&2, V> & V

def Map.get.bit(
  -V: Data, d: V, lo: Map<&2, V>, hi: Map<&2, V>, p2: Nat, kb: String & Bool
) -> Map<&2, V> & V:
  (key2, b) = kb
  match b:
    case False{}:
      Map.lo(&2, V, V, p2, hi, Map.get(V, d, lo, key2))
    case True{}:
      Map.hi(&2, V, V, p2, lo, Map.get(V, d, hi, key2))

def Map.get(V, d, m, key):
  match m:
    case MTip{}:
      (MTip{}, d)
    case MLeaf{k, v}:
      Map.get.leaf(V, d, v, String.cmp(key, k))
    case MNode{+pos, lo, hi}:
      Map.get.bit(V, d, lo, hi, pos, Map.bit(key, pos))

def Map.pop.lo(
  a, -V: Kind(a), pos: Nat, hi: Map<a, V>, r0: Map<a, V> & Maybe<a, V>
) -> Map<a, V> & Maybe<a, V>:
  (lo, r) = r0
  match lo:
    case MTip{}:
      (hi, r)
    case lo2:
      (MNode{pos, lo2, hi}, r)

def Map.pop.hi(
  a, -V: Kind(a), pos: Nat, lo: Map<a, V>, r0: Map<a, V> & Maybe<a, V>
) -> Map<a, V> & Maybe<a, V>:
  (hi, r) = r0
  match hi:
    case MTip{}:
      (lo, r)
    case hi2:
      (MNode{pos, lo, hi2}, r)

def Map.pop.leaf(a, -V: Kind(a), v: V, r: (String & String) & Cmp) ->
  Map<a, V> & Maybe<a, V>:
  ((key2, k2), c) = r
  match c:
    case LT{}:
      (MLeaf{k2, v}, None{})
    case EQ{}:
      (MTip{}, Some{v})
    case GT{}:
      (MLeaf{k2, v}, None{})

law Map.pop:
  for -a  : Quant
  for -V  : Kind(a)
  for m   : Map<a, V>
  for key : String
  Map<a, V> & Maybe<a, V>

def Map.pop.bit(
  a, -V: Kind(a), lo: Map<a, V>, hi: Map<a, V>, p2: Nat, kb: String & Bool
) -> Map<a, V> & Maybe<a, V>:
  (key2, b) = kb
  match b:
    case False{}:
      Map.pop.lo(a, V, p2, hi, Map.pop(a, V, lo, key2))
    case True{}:
      Map.pop.hi(a, V, p2, lo, Map.pop(a, V, hi, key2))

def Map.pop(a, V, m, key):
  match m:
    case MTip{}:
      (MTip{}, None{})
    case MLeaf{k, v}:
      Map.pop.leaf(a, V, v, String.cmp(key, k))
    case MNode{+pos, lo, hi}:
      Map.pop.bit(a, V, lo, hi, pos, Map.bit(key, pos))

def Map.del.fin(a, -V: Kind(a), r: Map<a, V> & Maybe<a, V>) -> Map<a, V>:
  (m2, x) = r
  m2

def Map.del(a, -V: Kind(a), m: Map<a, V>, key: String) -> Map<a, V>:
  Map.del.fin(a, V, Map.pop(a, V, m, key))

def Map.to_list.go(
  a, -V: Kind(a), m: Map<a, V>, acc: List<a, Sigma<&2, a, String, _ => V>>
) -> List<a, Sigma<&2, a, String, _ => V>>:
  match m:
    case MTip{}:
      acc
    case MLeaf{k, v}:
      (k, v) <> acc
    case MNode{pos, lo, hi}:
      Map.to_list.go(a, V, lo, Map.to_list.go(a, V, hi, acc))

def Map.to_list(a, -V: Kind(a), m: Map<a, V>) ->
  List<a, Sigma<&2, a, String, _ => V>>:
  Map.to_list.go(a, V, m, Nil{})

def Map.keys.go(a, -V: Kind(a), m: Map<a, V>, acc: List<&2, String>) ->
  List<&2, String>:
  match m:
    case MTip{}:
      acc
    case MLeaf{k, v}:
      k <> acc
    case MNode{pos, lo, hi}:
      Map.keys.go(a, V, lo, Map.keys.go(a, V, hi, acc))

def Map.keys(a, -V: Kind(a), m: Map<a, V>) -> List<&2, String>:
  Map.keys.go(a, V, m, Nil{})

def Map.from_list.go(
  a, -V: Kind(a), kvs: List<a, Sigma<&2, a, String, _ => V>>, m: Map<a, V>
) -> Map<a, V>:
  match kvs:
    case Nil{}:
      m
    case (k, v) <> t:
      Map.from_list.go(a, V, t, Map.set(a, V, m, k, v))

def Map.from_list(a, -V: Kind(a), kvs: List<a, Sigma<&2, a, String, _ => V>>) ->
  Map<a, V>:
  Map.from_list.go(a, V, kvs, MTip{})

def Map.union(a, -V: Kind(a), m: Map<a, V>, n: Map<a, V>) -> Map<a, V>:
  Map.from_list.go(a, V, Map.to_list(a, V, n), m)

def Map.size(a, -V: Kind(a), m: Map<a, V>) -> Nat:
  match m:
    case MTip{}:
      0n
    case MLeaf{k, v}:
      1n
    case MNode{pos, lo, hi}:
      Nat.add(Map.size(a, V, lo), Map.size(a, V, hi))

def Map.values.go(a, -V: Kind(a), m: Map<a, V>, acc: List<a, V>) -> List<a, V>:
  match m:
    case MTip{}:
      acc
    case MLeaf{k, v}:
      v <> acc
    case MNode{pos, lo, hi}:
      Map.values.go(a, V, lo, Map.values.go(a, V, hi, acc))

def Map.values(a, -V: Kind(a), m: Map<a, V>) -> List<a, V>:
  Map.values.go(a, V, m, Nil{})

# Set
# ---

def Set() -> Data:
  Map<&2, Unit>

def Set.new() -> Set():
  Map.new(&2, Unit)

def Set.add(s: Set(), key: String) -> Set():
  Map.set(&2, Unit, s, key, Unit{})

def Set.has(s: Set(), key: String) -> Set() & Bool:
  Map.has(&2, Unit, s, key)

def Set.del(s: Set(), key: String) -> Set():
  Map.del(&2, Unit, s, key)

def Set.size(s: Set()) -> Nat:
  Map.size(&2, Unit, s)

def Set.to_list(s: Set()) -> List<&2, String>:
  Map.keys(&2, Unit, s)

def Set.from_list.go(keys: List<&2, String>, s: Set()) -> Set():
  match keys:
    case Nil{}:
      s
    case h <> t:
      Set.from_list.go(t, Set.add(s, h))

def Set.from_list(keys: List<&2, String>) -> Set():
  Set.from_list.go(keys, Set.new())

# Image
# -----

def Image.sink(img: Image) -> Unit:
  Unit{}

def Image.drop.join(a: Unit, b: Unit, c: Unit, d: Unit) -> Unit:
  match a b c d:
    case Unit{} Unit{} Unit{} Unit{}:
      Unit{}

# Forks k levels, then a dead parameter sinks the rest in one loop.
def Image.free(+k: Nat, img: Image) -> Unit:
  match k:
    case 0n:
      Image.sink(img)
    case 1n+e:
      match img:
        case Pix{c}:
          Unit{}
        case Qua{tl, tr, bl, br}:
          a b c d = Image.free(e, tl) Image.free(e, tr) Image.free(e, bl)
            Image.free(e, br)
          Image.drop.join(a, b, c, d)

def Image.drop(img: Image) -> Unit:
  Image.free(7n, img)

# App
# ---

def App.next(
  -S: Type, window: Window, rest: Window -> S -> IO(Unit), next: Maybe<S>
) -> IO(Unit):
  match next:
    case None{}:
      Window.close(window)
    case Some{state}:
      rest(window, state)

def App.turn(
  -S: Type, shown: Window & Image & List<Event>,
  tick: List<Event> -> S -> IO(Maybe<S>), state: S,
  rest: Window -> S -> IO(Unit)
) -> IO(Unit):
  (window, image, events) = shown
  do IO<Unit>:
    Unit <- IO.pure(Unit, Image.drop!(image))
    IO.bind(Maybe<S>, Unit, tick(events, state), App.next(S, window, rest))

def App.draw(
  -S: Type, window: Window, drawn: S & Image,
  tick: List<Event> -> S -> IO(Maybe<S>), rest: Window -> S -> IO(Unit)
) -> IO(Unit):
  (state, image) = drawn
  do IO<Unit>:
    shown : Window & Image & List<Event> <- Window.frame(window, image)
    App.turn(S, shown, tick, state, rest)

def App.step(
  -S: Type, app: App<S>, window: Window, state: S,
  rest: Window -> S -> IO(Unit)
) -> IO(Unit):
  App{view, tick} = app
  App.draw(S, window, view(state), tick, rest)

def App.loop(~S: Type, ~app: App<S>, fuel: Nat, window: Window, state: S) ->
  IO(Unit):
  match fuel:
    case 0n:
      Window.close(window)
    case 1n+f:
      App.step(S, app, window, state, w => s => App.loop(~S, ~app, f, w, s))

def App.run(
  ~S: Type, ~app: App<S>, title: String, width: U32, height: U32, state: S
) -> IO(Unit):
  do IO<Unit>:
    window : Window <- IO.try(Window, Window.open(title, width, height))
    App.loop(~S, ~app, U32.to_nat(4294967295), window, state)

def App.more(-S: Type, rest: S -> IO(Maybe<S>), next: Maybe<S>) ->
  IO(Maybe<S>):
  match next:
    case None{}:
      IO.pure(Maybe<S>, None{})
    case Some{state}:
      rest(state)

def App.fold(
  -S: Type, app: App<S>, events: List<Event>, state: S,
  rest: S -> IO(Maybe<S>)
) -> IO(Maybe<S>):
  App{view, tick} = app
  IO.bind(Maybe<S>, Maybe<S>, tick(events, state), App.more(S, rest))

def App.play(~S: Type, ~app: App<S>, frames: List<List<Event>>, state: S) ->
  IO(Maybe<S>):
  match frames:
    case Nil{}:
      IO.pure(Maybe<S>, Some{state})
    case events <> rest:
      App.fold(S, app, events, state, s => App.play(~S, ~app, rest, s))
`;

// platform/path.ts
function parts(path) {
  return path.split("/");
}
function normalize(input) {
  if (input === "")
    return ".";
  const absolute = input.startsWith("/");
  const out = [];
  for (const part of parts(input)) {
    if (part === "" || part === ".")
      continue;
    if (part === "..") {
      if (out.length > 0 && out[out.length - 1] !== "..")
        out.pop();
      else if (!absolute)
        out.push(part);
    } else {
      out.push(part);
    }
  }
  const value = (absolute ? "/" : "") + out.join("/");
  return value || (absolute ? "/" : ".");
}
function join(...values) {
  return normalize(values.filter(Boolean).join("/"));
}
function dirname(input) {
  const value = normalize(input);
  if (value === "/" || value === ".")
    return value;
  const slash = value.lastIndexOf("/");
  if (slash < 0)
    return ".";
  return slash === 0 ? "/" : value.slice(0, slash);
}
function resolve(...values) {
  let result = "";
  for (let i = values.length - 1;i >= 0; i -= 1) {
    result = values[i] + (result ? "/" + result : "");
    if (values[i].startsWith("/"))
      break;
  }
  return normalize(result.startsWith("/") ? result : "/" + result);
}
var delimiter = ":";
var posix = { normalize, join, dirname, resolve, delimiter };

// platform/fs.ts
var globals = globalThis;
globals.process ??= {
  env: {},
  execPath: "/bin/bend",
  platform: "browser",
  arch: "wasm32"
};
globals.Buffer ??= {
  from(value) {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return {
      toString(encoding) {
        if (encoding !== "hex")
          throw new Error(`Unsupported Buffer encoding: ${encoding}`);
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      }
    };
  }
};
var files = new Map;
function key(path) {
  if (path instanceof URL)
    path = path.pathname;
  const value = normalize(path);
  return value.startsWith("/") ? value : "/" + value;
}
function mount(path, source) {
  files.set(key(path), source);
}
function ensureBundledBase(path) {
  if (!files.has(path) && path.endsWith("/base.bend"))
    files.set(path, base_default);
}
function existsSync(path) {
  const value = key(path);
  ensureBundledBase(value);
  return files.has(value);
}
function realpathSync(path) {
  const value = key(path);
  ensureBundledBase(value);
  if (!files.has(value))
    throw new Error(`ENOENT: no such file, realpath '${value}'`);
  return value;
}
function readFileSync(path, encoding) {
  if (encoding !== undefined && encoding !== "utf8" && encoding !== "utf-8") {
    throw new Error(`Unsupported file encoding: ${encoding}`);
  }
  const value = files.get(key(path));
  if (value === undefined)
    throw new Error(`ENOENT: no such file, open '${key(path)}'`);
  return value;
}
function writeFileSync(path, source) {
  const value = typeof source === "string" ? source : new TextDecoder().decode(source);
  files.set(key(path), value);
}
function mkdirSync(_path, _options) {}
mount("/base.bend", base_default);
mount("/bend2/base.bend", base_default);

// platform/os.ts
function homedir() {
  return "/home/web";
}

// platform/url.ts
function fileURLToPath(value) {
  const parsed = value instanceof URL ? value : new URL(value);
  return decodeURIComponent(parsed.pathname || "/");
}

// vendor/bend/bend2/bend.ts
function Var(k, i, s, v) {
  return { $: "Var", k, i, s, v };
}
function Ref(k, s, b) {
  return { $: "Ref", k, s, b };
}
function Sub(i, v, f, s) {
  return { $: "Sub", i, v, f, s };
}
function Let(k, i, v, f, s, q) {
  return { $: "Let", k, i, q: q ?? k.map(() => Lone()), v, f, s };
}
function Typ(g, s) {
  return { $: "Typ", g, s };
}
function Qnt(s) {
  return { $: "Qnt", s };
}
function Qua(q, s) {
  return { $: "Qua", q, s };
}
function Min(a, b, s) {
  return { $: "Min", a, b, s };
}
function All(q, k, i, A, B, s) {
  return { $: "All", q, k, i, A, B, s };
}
function Lam(k, i, f, s, q) {
  return { $: "Lam", k, i, f, s, q };
}
function App(f, x, s) {
  return { $: "App", f, x, s };
}
function ADT(k, x, s, r = []) {
  return { $: "ADT", k, x, r, s };
}
function Ctr(k, x, s) {
  return { $: "Ctr", k, x, s };
}
function Mat(k, h, m, s) {
  return { $: "Mat", k, h, m, s };
}
function Efq(s) {
  return { $: "Efq", s };
}
function Eql(a, b, T, s) {
  return { $: "Eql", a, b, T, s };
}
function Rfl(s) {
  return { $: "Rfl", s };
}
function Rwt(e, p, f, s) {
  return { $: "Rwt", e, p, f, s };
}
function Hol(k, s) {
  return { $: "Hol", k, s };
}
function Ann(x, T, s) {
  return { $: "Ann", x, T, s };
}
function Emp() {
  return { $: "Emp" };
}
function Bin(v, l, r) {
  return { $: "Bin", v, l, r };
}
function None() {
  return { $: "None" };
}
function Lone() {
  return { $: "Lone" };
}
function Many() {
  return { $: "Many" };
}
function Infer(tm, ty, us, x) {
  return { tm: Ann(tm, Var("_", -1, undefined, ty)), ty, us, x };
}
function Check(tm, ty, us) {
  return { tm: Ann(tm, Var("_", -1, undefined, ty)), us };
}
function Err(bok, ctx, exp, obs, spn, def, nte) {
  return { $: "Err", bok, ctx, exp, obs, spn, def, nte };
}
function char_is_head(c) {
  const n = c.charCodeAt(0);
  return n >= 65 && n <= 90 || n >= 97 && n <= 122 || n === 95;
}
function char_is_name(c) {
  const n = c.charCodeAt(0);
  return n >= 65 && n <= 90 || n >= 97 && n <= 122 || n >= 48 && n <= 57 || n === 95 || n === 46;
}
function pmap_get(map, key2) {
  let m = map;
  let k = key2;
  while (true) {
    switch (m.$) {
      case "Emp": {
        return null;
      }
      case "Bin": {
        if (k === 0) {
          return m.v;
        }
        const odd = k % 2 === 1;
        m = odd ? m.l : m.r;
        k = odd ? (k - 1) / 2 : (k - 2) / 2;
        break;
      }
    }
  }
}
function pmap_set(map, key2, val) {
  switch (map.$) {
    case "Emp": {
      return pmap_set(Bin(null, map, map), key2, val);
    }
    case "Bin": {
      if (key2 === 0) {
        return Bin(val, map.l, map.r);
      }
      if (key2 % 2 === 1) {
        const l = pmap_set(map.l, (key2 - 1) / 2, val);
        return Bin(map.v, l, map.r);
      }
      const r = pmap_set(map.r, (key2 - 2) / 2, val);
      return Bin(map.v, map.l, r);
    }
  }
}
function pmap_union(a, b, f) {
  if (a.$ === "Emp") {
    return b;
  }
  if (b.$ === "Emp") {
    return a;
  }
  const v = a.v === null ? b.v : b.v === null ? a.v : f(a.v, b.v);
  const l = pmap_union(a.l, b.l, f);
  const r = pmap_union(a.r, b.r, f);
  return Bin(v, l, r);
}
function pmap_to_array(map, acc = 0, scl = 1) {
  switch (map.$) {
    case "Emp": {
      return [];
    }
    case "Bin": {
      const v = map.v === null ? [] : [[acc, map.v]];
      const l = pmap_to_array(map.l, acc + scl * 1, scl * 2);
      const r = pmap_to_array(map.r, acc + scl * 2, scl * 2);
      return v.concat(l, r);
    }
  }
}
function list_get(list, key2) {
  for (let l = list;l !== null; l = l.n) {
    if (l.k === key2) {
      return l.v;
    }
  }
  return null;
}
function list_set(list, key2, val) {
  return { k: key2, v: val, n: list };
}
function quant_add(a, b) {
  if (a.$ === "None") {
    return b;
  }
  if (b.$ === "None") {
    return a;
  }
  return Many();
}
function quant_join(a, b) {
  if (a.$ === "Many" || b.$ === "Many") {
    return Many();
  }
  if (a.$ === "None") {
    return b;
  }
  return a;
}
function quant_dem(q, qt) {
  if (q.$ === "None") {
    return None();
  }
  return qt;
}
function quant_used(book, ctx, k, q, u, s, def) {
  if (quant_join(u, q).$ !== q.$) {
    let obs = quant_show(u) + k;
    if (u.$ === "Many") {
      obs = k + " (consumed more than once)";
    }
    throw Err(book, ctx, quant_show(q) + k, obs, s, def);
  }
}
function uses_nil() {
  return Emp();
}
function uses_get(u, k) {
  return pmap_get(u, k) ?? None();
}
function uses_add(a, b) {
  return pmap_union(a, b, quant_add);
}
function uses_del(u, k) {
  return pmap_set(u, k, None());
}
function lhs_ext(lhs, k, n, xs = []) {
  if (n === 0) {
    return term_apply(lhs, Ctr(k, xs));
  } else {
    return Lam("_", 0, (x) => {
      return lhs_ext(lhs, k, n - 1, [...xs, x]);
    });
  }
}
function lhs_kind(lhs, q) {
  return lhs.u === true && q.$ === "Many" ? Lone() : q;
}
function term_apply(fn, tm, s) {
  const f = term_strip(fn);
  if (f.$ === "Lam") {
    return f.f(tm);
  }
  return App(f, tm, s);
}
function term_unapply(tm) {
  const xs = [];
  let cur = tm;
  while (true) {
    switch (cur.$) {
      case "App": {
        xs.push(cur.x);
        cur = cur.f;
        break;
      }
      default: {
        xs.reverse();
        return [cur, xs];
      }
    }
  }
}
function term_cell(t, k = "_") {
  if (t.$ === "Var" && t.i < 0) {
    return t;
  }
  return Var(k, -1, t.s, t);
}
function term_force(t) {
  while (t.$ === "Var" && t.v !== undefined) {
    t = t.v;
  }
  return t;
}
function term_strip(tm) {
  let t = term_force(tm);
  while (t.$ === "Ann") {
    t = term_force(t.x);
  }
  return t;
}
function term_higher(tm, env = null) {
  switch (tm.$) {
    case "Var": {
      if (tm.i < 0) {
        return tm;
      }
      const v = list_get(env, tm.i);
      if (v === null) {
        return Ref(tm.k, tm.s);
      } else if (typeof v === "function") {
        return v(tm.s);
      } else {
        return v.s !== undefined || tm.s === undefined || v.$ === "Var" && v.i < 0 ? v : { ...v, s: tm.s };
      }
    }
    case "Ref": {
      if (tm.k[0] === "." && tm.k[1] !== ".") {
        const op = tm.s === undefined ? tm.k : tm.s.src.slice(tm.s.beg, tm.s.end);
        throw Err(book_nil(), ctx_nil(), "a type for this operator (write (a " + op + " b : Nat))", undefined, tm.s, undefined, `Note: we broke this after launch, sorry. Until 2.0.16 a bare operator meant Nat.
` + "That was a bug: operators demand annotation. Wrap the expression and it'll work again.");
      }
      return Ref(tm.k, tm.s, tm.b);
    }
    case "Sub": {
      const x = tm.v;
      const v = x.$ === "PVar" || x.$ === "PCtr" ? (s) => term_higher(patt_term(x, s), env) : term_higher(x, env);
      return term_higher(tm.f, list_set(env, tm.i, v));
    }
    case "Let": {
      const b = tm;
      const v = b.v.map((x) => term_higher(x, env));
      return Let(b.k, b.i, v, (xs) => {
        let e = env;
        for (let j = 0;j < xs.length; j++) {
          e = list_set(e, b.i[j], xs[j]);
        }
        return term_higher(b.f, e);
      }, b.s, b.q);
    }
    case "All": {
      const b = tm;
      const A = term_higher(b.A, env);
      return All(b.q, b.k, b.i, A, (x) => {
        return term_higher(b.B, list_set(env, b.i, x));
      }, b.s);
    }
    case "Lam": {
      const b = tm;
      return Lam(b.k, b.i, (x) => {
        return term_higher(b.f, list_set(env, b.i, x));
      }, b.s, b.q);
    }
    case "Typ": {
      return Typ(term_higher(tm.g, env), tm.s);
    }
    case "Qnt":
    case "Qua": {
      return tm;
    }
    case "Min": {
      return Min(term_higher(tm.a, env), term_higher(tm.b, env), tm.s);
    }
    case "App": {
      const f = term_higher(tm.f, env);
      const x = term_higher(tm.x, env);
      if (f.$ === "Lam") {
        return f.f(x);
      }
      return App(f, x, tm.s);
    }
    case "ADT": {
      return ADT(tm.k, tm.x.map((x) => term_higher(x, env)), tm.s, tm.r);
    }
    case "Ctr": {
      return Ctr(tm.k, tm.x.map((x) => term_higher(x, env)), tm.s);
    }
    case "Mat": {
      return Mat(tm.k, term_higher(tm.h, env), term_higher(tm.m, env), tm.s);
    }
    case "Efq": {
      return Efq(tm.s);
    }
    case "Eql": {
      return Eql(term_higher(tm.a, env), term_higher(tm.b, env), term_higher(tm.T, env), tm.s);
    }
    case "Rfl": {
      return Rfl(tm.s);
    }
    case "Rwt": {
      return Rwt(term_higher(tm.e, env), term_higher(tm.p, env), term_higher(tm.f, env), tm.s);
    }
    case "Hol": {
      return Hol(tm.k, tm.s);
    }
    case "Ann": {
      return Ann(term_higher(tm.x, env), term_higher(tm.T, env), tm.s);
    }
  }
}
function term_lower(term, d = 0) {
  const tm = term_force(term);
  switch (tm.$) {
    case "Var": {
      return Var(tm.k, tm.i, tm.s);
    }
    case "Ref": {
      return Ref(tm.k, tm.s, tm.b);
    }
    case "Sub": {
      return Sub(tm.i, tm.v.$ === "PVar" || tm.v.$ === "PCtr" ? tm.v : term_lower(tm.v, d), term_lower(tm.f, d), tm.s);
    }
    case "Let": {
      const xs = tm.k.map((k, j) => Var(k, d + j));
      const vs = tm.v.map((v) => term_lower(v, d));
      return Let(tm.k, xs.map((_, j) => d + j), vs, term_lower(tm.f(xs), d + tm.k.length), tm.s, tm.q);
    }
    case "Typ": {
      return Typ(term_lower(tm.g, d), tm.s);
    }
    case "Qnt":
    case "Qua": {
      return tm;
    }
    case "Min": {
      return Min(term_lower(tm.a, d), term_lower(tm.b, d), tm.s);
    }
    case "All": {
      const x = Var(tm.k, d);
      return All(tm.q, tm.k, d, term_lower(tm.A, d), term_lower(tm.B(x), d + 1), tm.s);
    }
    case "Lam": {
      const x = Var(tm.k, d);
      return Lam(tm.k, d, term_lower(tm.f(x), d + 1), tm.s, tm.q);
    }
    case "App": {
      return App(term_lower(tm.f, d), term_lower(tm.x, d), tm.s);
    }
    case "ADT": {
      return ADT(tm.k, tm.x.map((x) => term_lower(x, d)), tm.s, tm.r);
    }
    case "Ctr": {
      return Ctr(tm.k, tm.x.map((x) => term_lower(x, d)), tm.s);
    }
    case "Mat": {
      return Mat(tm.k, term_lower(tm.h, d), term_lower(tm.m, d), tm.s);
    }
    case "Efq": {
      return Efq(tm.s);
    }
    case "Eql": {
      return Eql(term_lower(tm.a, d), term_lower(tm.b, d), term_lower(tm.T, d), tm.s);
    }
    case "Rfl": {
      return Rfl(tm.s);
    }
    case "Rwt": {
      return Rwt(term_lower(tm.e, d), term_lower(tm.p, d), term_lower(tm.f, d), tm.s);
    }
    case "Hol": {
      return Hol(tm.k, tm.s);
    }
    case "Ann": {
      return Ann(term_lower(tm.x, d), term_lower(tm.T, d), tm.s);
    }
  }
}
function term_descend(q, arg, col) {
  if (q.$ === "None") {
    return "EQ";
  }
  const a = term_strip(arg);
  const p = term_strip(col);
  switch (p.$) {
    case "Var": {
      if (a.$ === "Var" && a.i === p.i) {
        return "EQ";
      } else {
        return "GT";
      }
    }
    case "Ctr": {
      if (a.$ === "Ctr" && a.k === p.k && a.x.length === p.x.length) {
        let ord = "EQ";
        for (let j = 0;j < a.x.length && ord !== "GT"; j++) {
          const fld = term_descend(Lone(), a.x[j], p.x[j]);
          ord = fld === "EQ" ? ord : fld;
        }
        if (ord !== "GT") {
          return ord;
        }
      }
      for (const q2 of p.x) {
        const sub = term_descend(Lone(), a, q2);
        if (sub !== "GT") {
          return "LT";
        }
      }
      return "GT";
    }
    default: {
      return "GT";
    }
  }
}
function ctx_nil() {
  return Emp();
}
function ctx_bind(ctx, i, q, k, T) {
  return pmap_set(ctx, i, { q, k, T });
}
function ctx_dead(book, ctx) {
  for (const [, a] of pmap_to_array(ctx)) {
    if (a.q.$ === "None") {
      continue;
    }
    const t = term_wnf(book, a.T);
    if (t.$ === "ADT" && book_adt(book, t, ctx).c.length === 0) {
      return true;
    }
  }
  return false;
}
function ctx_scope(ctx) {
  const bnd = [];
  for (const [i, a] of pmap_to_array(ctx)) {
    bnd[i] = a.k;
  }
  return Array.from(bnd, (k) => k ?? "_");
}
function ctrs_find(cs, k) {
  for (const c of cs) {
    if (c.k === k) {
      return c;
    }
  }
  return null;
}
function book_nil() {
  return { tlds: Object.create(null), ctrs: Object.create(null), order: [], hols: 0, open: 0, tmps: Object.create(null) };
}
function book_ctr(book, k) {
  return book.ctrs[k] ?? null;
}
function book_fam(book, k) {
  let t = term_strip(book_ctr(book, k).T);
  for (let d = 0;t.$ === "All"; d++) {
    t = term_strip(t.B(Var(t.k, d)));
  }
  return t.$ === "ADT" ? t.k : k;
}
function book_adt(book, tm, ctx, def) {
  const tld = book.tlds[tm.k];
  if (tld === undefined || tld.$ !== "ADT") {
    throw Err(book, ctx, "a declared datatype (unknown: " + tm.k + ")", undefined, tm.s, def);
  }
  if (tm.r.length === 0) {
    return tld;
  }
  const r = new Set(tm.r);
  return { $: "ADT", n: tld.n, g: tld.g, T: tld.T, c: tld.c.filter((c) => !r.has(c.k)) };
}
var BEND_DIR = import.meta.url.startsWith("file:///$bunfs/") ? join(dirname(realpathSync(process.execPath)), "..", "bend2") : fileURLToPath(new URL(".", import.meta.url));
var BASE_BEND = realpathSync(join(BEND_DIR, "base.bend"));
var BEND_LIB = resolve(process.env.BEND_LIB ?? join(homedir(), ".bend", "lib"));
var BEND_HUB = process.env.BEND_HUB ?? "https://hub.bend-lang.com";
async function hub_get(book, sub, hash, spn) {
  const res = await fetch(BEND_HUB + "/" + sub);
  const src = res.ok ? await res.text() : "";
  const sum = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(src))).toString("hex");
  if (!res.ok || hash.length < 32 || sum.slice(0, hash.length) !== hash || posix.normalize("/" + sub) !== "/" + sub) {
    throw Err(book, ctx_nil(), "a file at " + BEND_HUB + "/" + sub + " hashing to " + hash, undefined, spn);
  }
  return src;
}
async function book_load(book, file, ns, seen, spn) {
  if (file.startsWith(BEND_LIB + "/") && !existsSync(file)) {
    const pkg = file.slice(BEND_LIB.length + 1).split("/")[0];
    const man = await hub_get(book, pkg + "/manifest", pkg.slice(2), spn);
    const fls = man.trim().split(`
`).map((l) => l.split(" "));
    const srs = await Promise.all(fls.map(([h, p]) => hub_get(book, pkg + "/" + p, h, spn)));
    fls.forEach(([, p], i) => {
      const at = BEND_LIB + "/" + pkg + "/" + p;
      mkdirSync(dirname(at), { recursive: true });
      writeFileSync(at, srs[i]);
    });
  }
  if (!existsSync(file)) {
    throw Err(book, ctx_nil(), "no such file: " + file, undefined, spn);
  }
  const real = realpathSync(file);
  const done = seen.get(real);
  if (done === null) {
    throw Err(book, ctx_nil(), "an import cycle through " + file, undefined, spn);
  }
  if (done !== undefined) {
    if (done !== ns) {
      throw Err(book, ctx_nil(), "one namespace per file (" + file + " is both '" + done + "' and '" + ns + "')", undefined, spn);
    }
    return book.order.length;
  }
  seen.set(real, null);
  const dir = file.slice(0, file.lastIndexOf("/") + 1);
  const al = Object.create(null);
  const text = readFileSync(file, "utf8");
  const lines = text.split(`
`);
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(/^import(\s.*|)$/);
    if (m !== null) {
      const h = m[1].match(/^\s+(\S+)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?\s*(?:#.*)?$/);
      const beg = text.split(`
`, i).join(`
`).length + (i && 1) + lines[i].indexOf(h === null ? line : h[1]);
      const sp = { src: text, beg, end: beg };
      if (h === null || h[2] === undefined && h[1] !== "Base") {
        throw Err(book, ctx_nil(), "an import ('import Base', or 'import <path> as <Name>')", "'" + line + "'", sp);
      }
      if (h[2] === undefined) {
        await book_load(book, BASE_BEND, "", seen, sp);
      } else {
        const rel = posix.normalize(h[1]);
        if (!rel.endsWith(".bend")) {
          throw Err(book, ctx_nil(), "an import of a .bend file", "'" + h[1] + "'", sp);
        }
        let at = dir + rel;
        let sub = posix.join(posix.dirname(ns), rel);
        if (rel.startsWith("/")) {
          at = rel;
          sub = rel;
        }
        if (/^0x[0-9a-f]+\//.test(rel)) {
          at = BEND_LIB + "/" + rel;
          sub = rel;
        }
        al[h[2]] = sub.replace(/\.bend$/, "");
        await book_load(book, at, al[h[2]], seen, sp);
      }
      lines[i] = "";
      continue;
    }
    if (line !== "" && !line.startsWith("#")) {
      break;
    }
  }
  const n0 = book.order.length;
  parse_book(book, dir, lines.join(`
`), ns, al);
  if (real === BASE_BEND) {
    for (const k of book.order.slice(n0)) {
      book.tlds[k].b = true;
    }
  }
  seen.set(real, ns);
  return n0;
}
function tele_bind(tele, end) {
  return tele.reduceRight((out, [q, k, i, T, s]) => All(q, k, i, T, out, s), end);
}
function tele_open(book, tel) {
  const t = term_wnf(book, tel);
  return t.$ === "All" ? t : null;
}
function tele_head(book, tel, ctx, def, s) {
  const t = tele_open(book, tel);
  if (t === null) {
    throw Err(book, ctx, "unreachable (a telescope binds its parameters and fields)", undefined, s, def);
  }
  return t;
}
function tele_fill(book, tel, xs, ctx, def, s) {
  let out = tel;
  for (const x of xs) {
    out = tele_head(book, out, ctx, def, s).B(x);
  }
  return out;
}
function tele_check(book, lhs, tel, xs, qt, ctx, d, s) {
  const out = [];
  let us = uses_nil();
  for (const x of xs) {
    const t_all = tele_head(book, tel, ctx, lhs.def, s);
    const t_dem = quant_dem(t_all.q, qt);
    const x_chk = term_check(book, lhs, x, t_dem, t_all.A, ctx, d);
    out.push(x_chk.tm);
    us = uses_add(us, x_chk.us);
    tel = t_all.B(x);
  }
  return { xs: out, us, tel };
}
function tele_unbind(book, T) {
  const doms = [];
  let tel = T;
  for (let t = tele_open(book, tel);t !== null; t = tele_open(book, tel)) {
    doms.push([t.q, t.k, t.A]);
    tel = t.B(Var(t.k, doms.length - 1));
  }
  return { doms, ret: term_wnf(book, tel) };
}
function word_to_term(n, s) {
  let out = Ctr("WNil", [], s);
  for (let i = 31;i >= 0; i--) {
    out = Ctr("WCon", [Ctr(n >>> i & 1 ? "True" : "False", [], s), out], s);
  }
  return out;
}
function u32_to_term(n, s) {
  return Ctr("U32", [word_to_term(n, s)], s);
}
var NAT_LITERAL_MAX = 256;
function nat_to_term(n, s) {
  if (n > NAT_LITERAL_MAX) {
    return App(Ref("U32.to_nat", s), u32_to_term(n, s), s);
  }
  let out = Ctr("Zero", [], s);
  for (let i = 0;i < n; i++) {
    out = Ctr("Succ", [out], s);
  }
  return out;
}
function nat_from_term(t) {
  let n = 0;
  while (t.$ === "Ctr" && t.k === "Succ" && t.x.length === 1) {
    n += 1;
    t = t.x[0];
  }
  if (t.$ === "Ctr" && t.k === "Zero" && t.x.length === 0) {
    return n;
  }
  if (n === 0 && t.$ === "App" && t.f.$ === "Ref" && t.f.k === "U32.to_nat") {
    return u32_from_term(t.x);
  }
  return null;
}
function u32_from_term(tm, k = "U32") {
  const w0 = term_strip(tm);
  if (w0.$ !== "Ctr" || w0.k !== k || w0.x.length !== 1) {
    return null;
  }
  let n = 0;
  let i = 0;
  let w = term_strip(w0.x[0]);
  while (w.$ === "Ctr" && w.k === "WCon" && w.x.length === 2) {
    const b = term_strip(w.x[0]);
    if (b.$ !== "Ctr" || b.x.length !== 0 || b.k !== "True" && b.k !== "False") {
      return null;
    }
    n += b.k === "True" ? 2 ** i : 0;
    i += 1;
    w = term_strip(w.x[1]);
  }
  if (i !== 32 || w.$ !== "Ctr" || w.k !== "WNil" || w.x.length !== 0) {
    return null;
  }
  return n;
}
var F32_VIEW = new DataView(new ArrayBuffer(4));
function f32_to_bits(v) {
  F32_VIEW.setFloat32(0, v);
  return F32_VIEW.getUint32(0);
}
function f32_from_bits(n) {
  F32_VIEW.setUint32(0, n);
  return F32_VIEW.getFloat32(0);
}
function f32_show(x) {
  let s = "nan";
  for (let p = 1;x === x && p <= 9 && Math.fround(Number(s)) !== x; p += 1) {
    s = String(Number(x.toExponential(p - 1)));
  }
  return (Object.is(x, -0) ? "-0" : s).replace(/^-?\d+(?=e|$)/, "$&.0").replace("Infinity", "inf");
}
function quant_show(q) {
  return { None: "-", Lone: "", Many: "+" }[q.$];
}
var ESCAPES = {
  n: 10,
  t: 9,
  r: 13,
  "0": 0,
  "\\": 92,
  "'": 39,
  '"': 34
};
function term_key(tm) {
  return JSON.stringify(tm, (k, v) => k === "s" ? undefined : v);
}
function term_show(term, top = -1, bnd = []) {
  function term_show_sugar_exi(tm, prc) {
    const [h, xs] = term_unapply(tm);
    const b = xs[1];
    if (h.$ !== "Ref" || h.k !== "Exists" || xs.length !== 2 || b.$ !== "Lam") {
      return null;
    }
    const A = go(xs[0], 2);
    bnd.push(b.k);
    const f = go(b.f, 1);
    bnd.pop();
    const s = "&" + b.k + ":" + A + " -> " + f;
    return prc > 1 ? "(" + s + ")" : s;
  }
  function term_show_chain(tm, k, n) {
    const xs = [];
    let t = tm;
    while (t.$ === "Ctr" && t.k === k && t.x.length === n) {
      xs.push(t.x[0]);
      t = t.x[n - 1];
    }
    return [xs, t];
  }
  function term_show_sugar_nat(tm, prc) {
    const [xs, t] = term_show_chain(tm, "Succ", 1);
    const n = xs.length;
    if (t.$ === "Ctr" && t.k === "Zero" && t.x.length === 0) {
      return String(n) + "n";
    }
    if (n === 0) {
      return null;
    }
    const s = String(n) + "n+" + go(t, 1);
    return prc > 1 ? "(" + s + ")" : s;
  }
  function term_show_sugar_lst(tm, prc) {
    const [xs, t] = term_show_chain(tm, "Con", 2);
    if (t.$ === "Ctr" && t.k === "Nil" && t.x.length === 0) {
      return "[" + xs.map((x) => go(x, 0)).join(", ") + "]";
    }
    if (xs.length === 0) {
      return null;
    }
    const s = xs.map((x) => go(x, 2)).join(" <> ") + " <> " + go(t, 1);
    return prc > 1 ? "(" + s + ")" : s;
  }
  function term_show_sugar_tup(tm) {
    const [xs, t] = term_show_chain(tm, "Tuple", 2);
    if (xs.length === 0) {
      return null;
    }
    return "(" + xs.concat(t).map((x) => go(x, 0)).join(", ") + ")";
  }
  function term_show_sugar_arr(tm) {
    if (tm.$ === "Ctr" && tm.k === "ALeaf" && tm.x.length === 1) {
      return [go(tm.x[0], 0)];
    }
    if (tm.$ !== "Ctr" || tm.k !== "ANode" || tm.x.length !== 2) {
      return null;
    }
    const l = term_show_sugar_arr(tm.x[0]);
    const r = term_show_sugar_arr(tm.x[1]);
    if (l === null || r === null) {
      return null;
    }
    return l.concat(r);
  }
  function term_show_sugar_chr(tm, quote) {
    const n = tm.$ === "Ctr" && tm.k === "Chr" && tm.x.length === 1 ? u32_from_term(tm.x[0]) : null;
    if (n === null) {
      return null;
    }
    const k = Object.keys(ESCAPES).find((k2) => ESCAPES[k2] === n && (k2 !== "'" && k2 !== '"' || k2 === quote));
    if (k !== undefined) {
      return "\\" + k;
    }
    if (n < 32 || n === 127 || n >= 55296 && n <= 57343 || n > 1114111) {
      return "\\u{" + n.toString(16) + "}";
    }
    return String.fromCodePoint(n);
  }
  function term_show_sugar_str(tm) {
    const [cs, t] = term_show_chain(tm, "SCon", 2);
    const ss = cs.map((c) => term_show_sugar_chr(c, '"'));
    if (t.$ !== "Ctr" || t.k !== "SNil" || t.x.length !== 0 || ss.includes(null)) {
      return null;
    }
    return '"' + ss.join("") + '"';
  }
  function go(tm, prc) {
    switch (tm.$) {
      case "Var": {
        return bnd.lastIndexOf(tm.k) === tm.i ? tm.k : tm.k + "^" + String(tm.i);
      }
      case "Ref": {
        return (bnd.includes(tm.k) ? tm.k + "^" : tm.k) + (tm.b === true ? "!" : "");
      }
      case "Sub": {
        return go(tm.f, prc);
      }
      case "Let": {
        const vs = tm.v.map((v) => go(v, 1));
        for (const k of tm.k) {
          bnd.push(k);
        }
        const f = go(tm.f, -1);
        bnd.length -= tm.k.length;
        const ks = tm.k.map((k, j) => quant_show(tm.q[j]) + k);
        const s = ks.join(" ") + " = " + vs.join(" ") + "; " + f;
        return prc >= 0 ? "(" + s + ")" : s;
      }
      case "Typ": {
        const g = tm.g;
        if (g.$ === "Qua" && g.q.$ === "Lone") {
          return "Type";
        }
        if (g.$ === "Qua" && g.q.$ === "Many") {
          return "Data";
        }
        return "Kind(" + go(tm.g, 0) + ")";
      }
      case "Qnt": {
        return "Quant";
      }
      case "Qua": {
        return { None: "&0", Lone: "&1", Many: "&2" }[tm.q.$];
      }
      case "Min": {
        const s = go(tm.a, 2) + " <&> " + go(tm.b, 2);
        return prc > 1 ? "(" + s + ")" : s;
      }
      case "All": {
        const A = go(tm.A, 2);
        bnd.push(tm.k);
        const B = go(tm.B, 1);
        bnd.pop();
        const s = "@" + quant_show(tm.q) + tm.k + ":" + A + " -> " + B;
        return prc > 1 ? "(" + s + ")" : s;
      }
      case "Lam": {
        bnd.push(tm.k);
        const f = go(tm.f, -1);
        bnd.pop();
        const s = quant_show(tm.q ?? Lone()) + tm.k + " => " + f;
        return prc > 0 ? "(" + s + ")" : s;
      }
      case "App": {
        const sug = term_show_sugar_exi(tm, prc);
        if (sug !== null) {
          return sug;
        }
        const [h, xs] = term_unapply(tm);
        const hs = go(h, 2);
        const as = xs.map((x) => go(x, 0));
        return hs + "(" + as.join(", ") + ")";
      }
      case "ADT": {
        const as = tm.x.map((x) => go(x, 0));
        const rs = tm.r.map((c) => " - " + c + "{}").join("");
        const s = tm.k + (as.length === 0 && rs === "" ? "" : "<" + as.join(", ") + ">") + rs;
        return rs !== "" && prc > 1 ? "(" + s + ")" : s;
      }
      case "Ctr": {
        const u32 = u32_from_term(tm);
        const f32 = u32_from_term(tm, "F32");
        const chr = term_show_sugar_chr(tm, "'");
        const arr = term_show_sugar_arr(tm);
        const sug = u32 !== null ? String(u32) : f32 !== null ? f32_show(f32_from_bits(f32)) : term_show_sugar_nat(tm, prc) ?? (chr !== null ? "'" + chr + "'" : null) ?? term_show_sugar_str(tm) ?? term_show_sugar_lst(tm, prc) ?? term_show_sugar_tup(tm) ?? (arr !== null ? "[" + arr.join(", ") + "]" : null);
        if (sug !== null) {
          return sug;
        }
        const as = tm.x.map((x) => go(x, 0));
        return tm.k + "{" + as.join(", ") + "}";
      }
      case "Mat": {
        const arms = [];
        let m = tm;
        while (m.$ === "Mat") {
          arms.push(m.k + ": " + go(m.h, 1));
          m = m.m;
        }
        if (m.$ !== "Efq") {
          arms.push(go(m, 1));
        }
        return "\\{" + arms.join("; ") + "}";
      }
      case "Efq": {
        return "\\{}";
      }
      case "Eql": {
        return "{" + go(tm.a, 1) + " == " + go(tm.b, 1) + " : " + go(tm.T, 1) + "}";
      }
      case "Rfl": {
        return "{==}";
      }
      case "Hol": {
        return "?" + tm.k;
      }
      case "Rwt": {
        const e = go(tm.e, 1);
        const mp = term_strip(tm.p);
        const mb = mp.$ === "Lam" ? term_strip(mp.f) : mp;
        let n = "";
        let P;
        if (mp.$ === "Lam" && mb.$ === "Lam") {
          bnd.push(mp.k, mb.k);
          P = go(mb.f, 1);
          bnd.length -= 2;
          n = mb.k === "" ? "" : mb.k + "@";
        } else {
          P = go(tm.p, 1);
        }
        const f = go(tm.f, -1);
        const s = "%" + n + e + " : " + P + "; " + f;
        return prc > 0 ? "(" + s + ")" : s;
      }
      case "Ann": {
        return "{" + go(tm.x, 1) + " : " + go(tm.T, 1) + "}";
      }
    }
  }
  return go(term, top);
}
function expr_show(book, x, bnd = []) {
  if (typeof x === "string") {
    return x;
  } else {
    const t = term_lower(term_snf(book, x), bnd.length);
    return term_show(t, -1, bnd);
  }
}
function typeless_show(book, ctx, tm) {
  return "non-inferrable term '" + expr_show(book, tm, ctx_scope(ctx)) + "'" + (tm.$ === "Ctr" && book.tlds[tm.k]?.$ === "ADT" ? " (" + tm.k + " is a datatype: write its arguments as <>)" : "");
}
function err_show(err) {
  const bnd = ctx_scope(err.ctx);
  const anns = pmap_to_array(err.ctx).sort((a, b) => a[0] - b[0]);
  const wid = Math.max(0, ...anns.map(([, a]) => a.k.length));
  const msg = err.obs === undefined ? `
- message  : ` + expr_show(err.bok, err.exp, bnd) : `
- expected : ` + expr_show(err.bok, err.exp, bnd) + `
- observed : ` + expr_show(err.bok, err.obs, bnd);
  const ctx = anns.map(([i, a]) => `
- ` + a.k.padEnd(wid) + " : " + term_show(term_lower(term_snf(err.bok, a.T), i), -1, bnd.slice(0, i))).join("");
  const def = err.def === undefined ? "" : " " + err.def;
  let spn = "";
  if (err.spn !== undefined) {
    const lns = err.spn.src.split(`
`);
    const at = err.spn.src.slice(0, err.spn.beg).split(`
`).length;
    const beg = Math.max(1, at - 1);
    const end = Math.min(lns.length, at + 1);
    spn = `
` + lns.slice(beg - 1, end).map((l, j) => String(beg + j).padStart(String(end).length) + (beg + j === at ? ">| " : " | ") + l).join(`
`);
  }
  const loc = def === "" && spn === "" ? "" : `
Location:` + def + spn;
  const nte = err.nte === undefined ? "" : `
` + err.nte;
  return "Error:" + msg + (anns.length === 0 ? "" : `
Context:`) + ctx + loc + nte;
}
var KEYWORDS = new Set([
  "def",
  "type",
  "law",
  "match",
  "case",
  "do",
  "return",
  "for",
  "exs",
  "where",
  "is",
  "import",
  "Type",
  "Data",
  "Kind",
  "Quant"
]);
var QUAS = { "0": None(), "1": Lone(), "2": Many() };
function parse_col(src, pos) {
  return pos - src.lastIndexOf(`
`, pos - 1);
}
function parse_span(p, beg) {
  return { src: p.str, beg, end: p.pos };
}
function parse_fail(p, exp) {
  const obs = p.pos < p.str.length ? "'" + p.str[p.pos] + "'" : "end of input";
  throw Err(p.book, ctx_nil(), exp, obs, { src: p.str, beg: p.pos, end: p.pos });
}
function parse_peek(p) {
  return p.pos < p.str.length ? p.str[p.pos] : "";
}
function parse_bump(p) {
  const c = parse_peek(p);
  p.pos += 1;
  return c;
}
function parse_at(p, s) {
  if (p.str.charCodeAt(p.pos) !== s.charCodeAt(0)) {
    return false;
  }
  return s.length === 1 || p.str.startsWith(s, p.pos);
}
function parse_take(p, s) {
  if (!parse_at(p, s)) {
    return false;
  }
  p.pos += s.length;
  return true;
}
function parse_skip(p) {
  const s = p.str;
  while (p.pos < s.length) {
    const n = s.charCodeAt(p.pos);
    if (n === 32 || n === 10 || n === 13 || n === 9) {
      p.pos += 1;
      continue;
    }
    if (n === 35) {
      while (p.pos < s.length && s.charCodeAt(p.pos) !== 10) {
        p.pos += 1;
      }
      continue;
    }
    return;
  }
}
function parse_eat(p, s) {
  parse_skip(p);
  if (!parse_take(p, s)) {
    parse_fail(p, "'" + s + "'");
  }
}
function parse_at_word(p, w) {
  parse_skip(p);
  if (!parse_at(p, w)) {
    return false;
  }
  return !char_is_name(p.str[p.pos + w.length] ?? "");
}
function parse_word(p, w) {
  if (!parse_at_word(p, w)) {
    return false;
  }
  parse_take(p, w);
  return true;
}
function parse_lexeme(p) {
  parse_skip(p);
  if (!char_is_head(parse_peek(p))) {
    parse_fail(p, "a name");
  }
  const beg = p.pos;
  while (p.pos < p.str.length && char_is_name(p.str[p.pos])) {
    p.pos += 1;
  }
  const k = p.str.slice(beg, p.pos);
  if (k.endsWith(".")) {
    parse_fail(p, "a name (a name cannot end in '.')");
  }
  return k;
}
function parse_name(p) {
  const k = parse_lexeme(p);
  if (KEYWORDS.has(k)) {
    parse_fail(p, "a name (got the keyword '" + k + "')");
  }
  return k;
}
function parse_char(p) {
  if (parse_take(p, "\\")) {
    const u = /^u\{([0-9a-f]+)\}/i.exec(p.str.slice(p.pos, p.pos + 11));
    if (u !== null) {
      p.pos += u[0].length;
      return parseInt(u[1], 16);
    }
    const c = ESCAPES[parse_bump(p)];
    if (c === undefined) {
      parse_fail(p, "an escape (\\n \\t \\r \\0 \\\\ \\' \\\" \\u{1F600})");
    }
    return c;
  }
  const n = p.str.codePointAt(p.pos);
  if (n === undefined) {
    parse_fail(p, "a character");
  }
  p.pos += n > 65535 ? 2 : 1;
  return n;
}
function parse_open(p, k) {
  const i = p.sc.frs++;
  if (k !== "_") {
    p.sc.stk.push([k, i]);
  }
  return i;
}
function parse_close(p, n) {
  p.sc.stk.length = n;
}
function parse_lookup(p, k) {
  const stk = p.sc.stk;
  for (let j = stk.length - 1;j >= 0; j--) {
    if (stk[j][0] === k) {
      return stk[j];
    }
  }
  return null;
}
function parse_var(p, k, s) {
  const e = parse_lookup(p, k);
  if (e !== null) {
    return Var(k, e[1], s);
  }
  const q = parse_reso(p, k);
  if (q !== k || k.includes(".")) {
    return Ref(q, s);
  }
  return Var(k, p.sc.frs++, s);
}
function parse_qual(p, k) {
  return p.ns === "" ? k : p.ns + "." + k;
}
function parse_reso(p, k) {
  const dot = k.indexOf(".");
  let q = parse_qual(p, k);
  if (dot !== -1 && k.slice(0, dot) in p.al) {
    q = p.al[k.slice(0, dot)] + k.slice(dot);
  }
  if (q in p.book.tlds || q in p.book.ctrs) {
    return q;
  }
  return k;
}
function parse_quant(p) {
  parse_skip(p);
  if (parse_take(p, "-")) {
    return None();
  }
  if (parse_take(p, "+")) {
    return Many();
  }
  return Lone();
}
function parse_bind(p, t) {
  if (t.$ !== "Var") {
    parse_fail(p, "a lambda binder (one name: k => body)");
  }
  return { $: "PVar", k: t.k, i: parse_open(p, t.k), q: t.i < 0 ? Many() : Lone(), s: t.s };
}
function parse_patt(p, t) {
  const book = p.book;
  const lit = t.$ === "App" ? nat_from_term(t) : null;
  if (lit !== null) {
    t = Ctr("Zero", [], t.s);
    for (let i = 0;i < lit; i++) {
      t = Ctr("Succ", [t], t.s);
    }
  }
  switch (t.$) {
    case "Var": {
      if (book_ctr(book, parse_reso(p, t.k)) !== null) {
        throw Err(book, ctx_nil(), "a braced constructor pattern (" + t.k + " is a constructor: write " + t.k + "{}, or rename the binder)", undefined, t.s);
      }
      return parse_bind(p, t);
    }
    case "Ctr": {
      const ctr = book_ctr(book, t.k);
      if (ctr === null) {
        throw Err(book, ctx_nil(), "a declared constructor (unknown: " + t.k + ")", undefined, t.s);
      }
      if (ctr.n !== t.x.length) {
        throw Err(book, ctx_nil(), "a " + t.k + " pattern with " + String(ctr.n) + (ctr.n === 1 ? " field" : " fields"), undefined, t.s);
      }
      return { $: "PCtr", k: t.k, x: t.x.map((x) => parse_patt(p, x)), s: t.s };
    }
    default: {
      throw Err(book, ctx_nil(), "a pattern (a binder or a constructor)", term_show(term_lower(term_higher(t), 0)), t.s);
    }
  }
}
function parse_term(p, lvl = 0) {
  parse_skip(p);
  const beg = p.pos;
  const base = parse_term_base(p, beg);
  base.s ??= parse_span(p, beg);
  return parse_term_ops(p, base, lvl);
}
function parse_term_base(p, beg) {
  const c = parse_peek(p);
  if (char_is_head(c)) {
    const k = parse_lexeme(p);
    if (k === "Type") {
      return Typ(Qua(Lone()), parse_span(p, beg));
    }
    if (k === "Data") {
      return Typ(Qua(Many()), parse_span(p, beg));
    }
    if (k === "Quant") {
      return Qnt(parse_span(p, beg));
    }
    if (k === "Kind") {
      parse_eat(p, "(");
      const g = parse_term(p);
      parse_eat(p, ")");
      return Typ(g, parse_span(p, beg));
    }
    if (k === "do") {
      const m = parse_name(p);
      parse_eat(p, "<");
      const ts = parse_term_args(p, ">");
      parse_eat(p, ":");
      parse_skip(p);
      return parse_term_do_stmt(p, m, ts.slice(0, -1), ts[ts.length - 1] ?? null, parse_col(p.str, p.pos));
    }
    if (k === "match") {
      parse_fail(p, "a term (a match heads a def body, not a term)");
    }
    if (k === "case") {
      parse_fail(p, "a match heading this case (this case is orphaned)");
    }
    if (k === "return") {
      parse_fail(p, "a do-block heading this return");
    }
    if (KEYWORDS.has(k)) {
      parse_fail(p, "a term (the keyword '" + k + "' cannot head one)");
    }
    if (parse_at(p, "{")) {
      parse_bump(p);
      const xs = parse_term_args(p, "}");
      return Ctr(parse_reso(p, k), xs, parse_span(p, beg));
    }
    return parse_var(p, k, parse_span(p, beg));
  }
  if (/[0-9]/.test(c)) {
    return parse_term_num(p);
  }
  switch (c) {
    case "@": {
      return parse_term_all(p, false);
    }
    case "&": {
      const q = QUAS[p.str[p.pos + 1] ?? ""];
      if (q !== undefined) {
        parse_bump(p);
        parse_bump(p);
        return Qua(q, parse_span(p, beg));
      }
      return parse_term_all(p, true);
    }
    case "+": {
      parse_bump(p);
      const t = parse_term(p, 12);
      const s = parse_span(p, beg);
      const k = t.$ === "ADT" ? t.k : t.$ === "Var" || t.$ === "Ref" ? parse_reso(p, t.k) : "";
      const tld = p.book.tlds[k];
      if (t.$ === "Var" && (tld === undefined || tld.$ !== "ADT")) {
        return Var(t.k, -1, s);
      }
      if (tld === undefined || tld.$ !== "ADT" || tld.g === 0 || tld.g < tld.n && t.$ !== "ADT") {
        parse_fail(p, "a quantified datatype after + (+D<..> sets D's leading quantities to &2)");
      }
      const xs = t.$ === "ADT" ? t.x : Array.from({ length: tld.n }, () => Qua(Lone(), s));
      return ADT(k, xs.map((x, i) => i < tld.g ? Qua(Many(), s) : x), s);
    }
    case "\\": {
      parse_bump(p);
      parse_eat(p, "{");
      const arms = [];
      let tail = Efq();
      while (true) {
        parse_skip(p);
        if (parse_take(p, "}")) {
          break;
        }
        const t = parse_term(p);
        parse_skip(p);
        if ((t.$ === "Var" || t.$ === "Ref") && parse_take(p, ":")) {
          const h = parse_term(p);
          arms.push([parse_reso(p, t.k), h]);
          parse_skip(p);
          parse_take(p, ";");
          continue;
        }
        tail = t;
        parse_skip(p);
        parse_take(p, ";");
        parse_eat(p, "}");
        break;
      }
      const s = parse_span(p, beg);
      tail.s ??= s;
      return arms.reduceRight((out, arm) => Mat(arm[0], arm[1], out, s), tail);
    }
    case "%": {
      parse_bump(p);
      const e0 = parse_term(p);
      parse_skip(p);
      let k = "";
      let e = e0;
      if (parse_take(p, "@")) {
        if (e0.$ !== "Var") {
          parse_fail(p, "a name before @ (a rewrite binder is one name: %e@E : P)");
        }
        k = e0.k;
        e = parse_term(p);
      }
      parse_eat(p, ":");
      const n0 = p.sc.stk.length;
      const xi = p.sc.frs++;
      p.sc.stk.push(["_", xi]);
      const ei = parse_open(p, k);
      const P = parse_term(p);
      parse_close(p, n0);
      parse_skip(p);
      parse_take(p, ";");
      const f = parse_block(p);
      const s = parse_span(p, beg);
      return Rwt(e, Lam("_", xi, Lam(k, ei, P, e0.s), s), f, s);
    }
    case "{": {
      parse_bump(p);
      parse_skip(p);
      if (parse_take(p, "==")) {
        parse_eat(p, "}");
        return Rfl();
      }
      const a = parse_term(p);
      parse_skip(p);
      if (parse_take(p, "==")) {
        const b = parse_term(p);
        parse_eat(p, ":");
        const T2 = parse_term(p);
        parse_eat(p, "}");
        return Eql(a, b, T2);
      }
      if (parse_take(p, "!=")) {
        const ns = parse_span(p, p.pos - 2);
        const b = parse_term(p);
        parse_eat(p, ":");
        const T2 = parse_term(p);
        parse_eat(p, "}");
        const s = parse_span(p, beg);
        return All(Lone(), "_", parse_open(p, "_"), Eql(a, b, T2, s), Ref("Empty", ns), s);
      }
      parse_eat(p, ":");
      const T = parse_term(p);
      parse_eat(p, "}");
      return Ann(a, T);
    }
    case "(": {
      parse_bump(p);
      return parse_term_tup(p, beg);
    }
    case "[": {
      parse_bump(p);
      parse_skip(p);
      const xs = parse_at(p, "]") ? [] : [parse_term(p)];
      parse_skip(p);
      if (xs.length !== 0 && parse_take(p, ":")) {
        const T = parse_term(p, 12);
        parse_skip(p);
        const cnt = parse_take(p, "*");
        if (!cnt) {
          parse_eat(p, "^");
        }
        const n = parse_term(p);
        parse_eat(p, "]");
        const s = parse_span(p, beg);
        parse_term_ns(p, xs[0], T);
        let d = n;
        if (cnt) {
          const k = nat_from_term(n) ?? 0;
          if (k === 0 || (k & k - 1) !== 0) {
            throw Err(p.book, ctx_nil(), "a power of two count (^d takes a depth)", undefined, n.s);
          }
          d = nat_to_term(Math.log2(k), n.s);
        }
        return App(App(App(Ref("Array.new", s), T, s), d, s), xs[0], s);
      }
      parse_take(p, ",");
      const ys = xs.concat(parse_term_args(p, "]"));
      const spn = parse_span(p, beg);
      return ys.reduceRight((t, x) => Ctr("Con", [x, t], spn), Ctr("Nil", [], spn));
    }
    case "'": {
      parse_bump(p);
      const n = parse_char(p);
      if (!parse_take(p, "'")) {
        parse_fail(p, "a closing '");
      }
      const spn = parse_span(p, beg);
      return Ctr("Chr", [u32_to_term(n, spn)], spn);
    }
    case '"': {
      parse_bump(p);
      const cs = [];
      while (!parse_take(p, '"')) {
        if (p.pos >= p.str.length) {
          parse_fail(p, 'a closing "');
        }
        cs.push(parse_char(p));
      }
      const spn = parse_span(p, beg);
      return cs.reduceRight((out, c2) => Ctr("SCon", [Ctr("Chr", [u32_to_term(c2, spn)], spn), out], spn), Ctr("SNil", [], spn));
    }
    case "?": {
      parse_bump(p);
      const k = parse_name(p);
      if (k === "TODO") {
        p.book.hols += 1;
      }
      return Hol(k, parse_span(p, beg));
    }
    default: {
      parse_fail(p, "a term");
    }
  }
}
var INFIX_OPS = [
  [".|.", 6, false, ".or"],
  [".^.", 7, false, ".xor"],
  [".&.", 8, false, ".and"],
  ["||", 2, false, "Bool.or"],
  ["&&", 3, false, "Bool.and"],
  ["<=", 4, false, ".is_le"],
  [">=", 4, false, ".is_ge"],
  ["<>", 5, true, ""],
  ["++", 5, true, "String.append"],
  ["<<", 9, false, ".shln"],
  [">>", 9, false, ".shrn"],
  ["&", 1, true, ""],
  ["|", 1, true, ""],
  [">", 4, false, ".is_gt"],
  ["+", 10, false, ".add"],
  ["-", 10, false, ".sub"],
  ["*", 11, false, ".mul"],
  ["/", 11, false, ".div"],
  ["%", 11, false, ".mod"]
];
function parse_grow(p, t) {
  if (t.s === undefined) {
    return;
  }
  return parse_span(p, t.s.beg);
}
function parse_nl(p) {
  for (let j = p.pos - 1;j >= 0; j--) {
    const c = p.str[j];
    if (c === `
`) {
      return true;
    }
    if (c !== " " && c !== "\r" && c !== "\t") {
      return false;
    }
  }
  return true;
}
function parse_term_ops(p, tm, lvl) {
  let out = tm;
  while (true) {
    parse_skip(p);
    if (parse_nl(p) && (parse_at(p, "(") || parse_at(p, "["))) {
      return out;
    }
    if (parse_at(p, "!(")) {
      if (out.$ === "Var" && parse_lookup(p, out.k) === null) {
        out = Ref(out.k, out.s);
      }
      if (out.$ !== "Ref") {
        parse_fail(p, "a named def before ! (only f!(..) offloads)");
      }
      parse_bump(p);
      out.b = true;
      continue;
    }
    if (parse_at(p, "(")) {
      parse_bump(p);
      const hd = out.$ === "Ref" || out.$ === "Var" && parse_lookup(p, out.k) === null ? p.book.tlds[out.k] : undefined;
      const x = hd?.$ === "Def" ? hd.x : 0;
      const ts = [];
      for (parse_skip(p);x > 0 && parse_at(p, "~"); parse_skip(p)) {
        if (ts.length === x) {
          parse_fail(p, "a term (" + out.k + " takes " + String(x) + " ~)");
        }
        parse_bump(p);
        ts.push(parse_term(p));
        parse_skip(p);
        parse_take(p, ",");
      }
      const xs = ts.concat(parse_term_args(p, ")"));
      const s2 = parse_grow(p, out);
      for (const a of xs) {
        out = App(out, a, s2);
      }
      continue;
    }
    if (parse_at(p, "[")) {
      parse_bump(p);
      const ix = parse_term(p);
      parse_eat(p, "]");
      const s2 = parse_grow(p, out);
      parse_term_ns(p, ix, Ref("U32", s2));
      parse_skip(p);
      if (!parse_nl(p) && parse_take(p, "<-")) {
        const v = parse_term(p, 2);
        out = App(App(App(App(Ref("Array.set", s2), Ref("U32", s2), s2), out, s2), ix, s2), v, s2);
      } else {
        out = App(App(App(Ref("Array.get", s2), Ref("U32", s2), s2), out, s2), ix, s2);
      }
      continue;
    }
    if (parse_at(p, "<") && !"-=<>".includes(p.str[p.pos + 1] ?? "") && !parse_at(p, "<&>") && (lvl <= 4 || /\S/.test(p.str[p.pos - 1] ?? ""))) {
      parse_bump(p);
      const t2 = parse_span(p, p.pos - 1);
      const a = parse_term(p, 5);
      parse_skip(p);
      const s2 = parse_grow(p, out);
      if (parse_at(p, ">") || parse_at(p, ",")) {
        if (out.$ !== "Var" && out.$ !== "Ref") {
          parse_fail(p, "a family name before <..> (a comparison here needs parens)");
        }
        const xs = [a];
        if (!parse_take(p, ">")) {
          parse_take(p, ",");
          xs.push(...parse_term_args(p, ">"));
        }
        const k = parse_reso(p, out.k);
        const tld = p.book.tlds[k];
        if (tld !== undefined && tld.$ === "ADT" && xs.length + tld.g === tld.n) {
          xs.unshift(...Array.from({ length: tld.g }, () => Qua(Lone(), s2)));
        }
        out = ADT(k, xs, s2);
      } else {
        out = App(App(Ref(".is_lt", t2), out, s2), a, s2);
      }
      continue;
    }
    if (lvl === 0 && parse_take(p, "=>")) {
      const n0 = p.sc.stk.length;
      const x = parse_bind(p, out);
      const f = parse_block(p);
      parse_close(p, n0);
      out = Lam(x.k, x.i, f, x.s, x.q);
      continue;
    }
    if (lvl === 0 && parse_take(p, "->")) {
      const B = parse_term(p);
      const s2 = parse_grow(p, out);
      out = All(Lone(), "_", parse_open(p, "_"), out, B, s2);
      continue;
    }
    if (lvl <= 5 && parse_take(p, "<&>")) {
      const b2 = parse_term(p, 5);
      out = Min(out, b2, parse_grow(p, out));
      continue;
    }
    const op = INFIX_OPS.find((op2) => {
      const nx = p.str[p.pos + op2[0].length] ?? "";
      return parse_at(p, op2[0]) && !((op2[0] === "-" || op2[0] === "+") && (nx === ">" || char_is_head(nx))) && !(op2[0][0] === ">" && !/\s/.test(p.str[p.pos - 1] ?? " ")) && !(op2[0] === "%" && !/\s/.test(nx));
    });
    if (op === undefined || op[1] < lvl || parse_at(p, "<-")) {
      return out;
    }
    parse_take(p, op[0]);
    const t = parse_span(p, p.pos - op[0].length);
    const b = parse_term(p, op[2] ? op[1] : op[1] + 1);
    const s = parse_grow(p, out);
    if (op[0] === "<>") {
      out = Ctr("Con", [out, b], s);
    } else if (op[0] === "&") {
      out = App(App(Ref("Pair", s), out, s), b, s);
    } else if (op[0] === "|") {
      out = App(App(Ref("Or", s), out, s), b, s);
    } else {
      out = App(App(Ref(op[3], t), out, s), b, s);
    }
  }
}
function parse_term_ns(p, tm, T) {
  if (tm.$ === "Let") {
    return parse_term_ns(p, tm.f, T);
  }
  const [f, xs] = term_unapply(tm);
  if (f.$ !== "Ref") {
    return;
  }
  if (f.k[0] === ".") {
    const h = term_unapply(T)[0];
    if (h.$ !== "Var" && h.$ !== "Ref" && h.$ !== "ADT") {
      throw Err(p.book, ctx_nil(), "a type name after : (the operators' namespace)", undefined, h.s);
    }
    f.k = parse_reso(p, h.k + f.k);
  } else if (f.k !== "Bool.and" && f.k !== "Bool.or" && f.k !== "String.append") {
    return;
  }
  for (const x of xs) {
    parse_term_ns(p, x, T);
  }
}
function parse_term_args(p, close) {
  const xs = [];
  while (true) {
    parse_skip(p);
    if (parse_take(p, close)) {
      return xs;
    }
    const x = parse_term(p);
    xs.push(x);
    parse_skip(p);
    parse_take(p, ",");
  }
}
function parse_term_all(p, exi) {
  const beg = p.pos;
  parse_bump(p);
  const q = exi ? Lone() : parse_quant(p);
  const k = parse_name(p);
  parse_eat(p, ":");
  const A = parse_term(p, 1);
  parse_eat(p, "->");
  const n0 = p.sc.stk.length;
  const i = parse_open(p, k);
  const B = parse_term(p);
  parse_close(p, n0);
  if (exi) {
    const s = parse_span(p, beg);
    return App(App(Ref("Exists", s), A, s), Lam(k, i, B, s), s);
  }
  return All(q, k, i, A, B);
}
function parse_term_tup(p, beg) {
  parse_skip(p);
  const b = parse_body(p, parse_col(p.str, p.pos) - 1);
  parse_skip(p);
  if (b.$ === "Reply" && parse_take(p, ",")) {
    const rest = parse_term_tup(p, beg);
    return Ctr("Tuple", [b.x, rest], parse_span(p, beg));
  }
  const out = body_flatten(b, [], () => p.sc.frs++);
  if (parse_take(p, ":")) {
    parse_term_ns(p, out, parse_term(p));
  }
  parse_eat(p, ")");
  return out;
}
var NUMBER = /(\d+)(n|\.\d+([eE][+-]?\d+)?)?/y;
function parse_term_num(p) {
  const beg = p.pos;
  NUMBER.lastIndex = p.pos;
  const m = NUMBER.exec(p.str);
  const s = m[1];
  p.pos += m[0].length;
  if (m[2] !== undefined && m[2] !== "n") {
    const v = Math.fround(Number(m[0]));
    if (!isFinite(v)) {
      parse_fail(p, "a float literal with a finite f32 value (got " + m[0] + ")");
    }
    const spn = parse_span(p, beg);
    return Ctr("F32", [word_to_term(f32_to_bits(v), spn)], spn);
  }
  if (m[2] === undefined) {
    if (char_is_name(parse_peek(p))) {
      parse_fail(p, "a numeric literal (NUMBER is U32, NUMBER n is Nat)");
    }
    const w = Number(s);
    if (w > 4294967295) {
      parse_fail(p, "a u32 literal up to 4294967295 (got " + s + ")");
    }
    return u32_to_term(w, parse_span(p, beg));
  }
  const n = Number(s);
  if (n > 4294967295) {
    parse_fail(p, "a nat literal up to 4294967295n (got " + s + "n)");
  }
  if (parse_take(p, "+")) {
    let out = parse_term(p);
    const spn = parse_span(p, beg);
    if (n > NAT_LITERAL_MAX) {
      return App(App(Ref("Nat.add", spn), nat_to_term(n, spn), spn), out, spn);
    }
    for (let i = 0;i < n; i++) {
      out = Ctr("Succ", [out], spn);
    }
    return out;
  }
  if (char_is_name(parse_peek(p))) {
    parse_fail(p, "a nat literal (NUMBER n)");
  }
  return nat_to_term(n, parse_span(p, beg));
}
function parse_term_do_stmt(p, m, ls, R, col) {
  function parse_term_do_call(op, xs, ys, s2) {
    return ls.concat(xs, R === null ? [] : [R], ys).reduce((fn, x2) => App(fn, x2, s2), Ref(parse_reso(p, m + "." + op), s2));
  }
  parse_skip(p);
  const beg = p.pos;
  if (parse_word(p, "return")) {
    const e = parse_term(p);
    return parse_term_do_call("pure", [], [e], parse_span(p, beg));
  }
  const t = parse_term(p);
  parse_skip(p);
  const typed = t.$ === "Var" && parse_take(p, ":");
  const step = !typed && parse_more(p, col);
  const A = typed ? parse_term(p, 1) : step ? parse_var(p, "Unit", t.s) : t;
  parse_skip(p);
  const asg = typed && parse_at(p, "=") && !parse_at(p, "==");
  if (asg) {
    parse_bump(p);
  } else if (typed) {
    parse_eat(p, "<-");
  } else if (!step && !parse_take(p, "<-")) {
    return t;
  }
  const v = step ? t : parse_term(p);
  parse_skip(p);
  parse_take(p, ";");
  const s = parse_span(p, beg);
  const n0 = p.sc.stk.length;
  const x = parse_bind(p, typed ? t : Var("_", 0));
  const f = parse_term_do_stmt(p, m, ls, R, col);
  parse_close(p, n0);
  if (asg) {
    return Let([x.k], [x.i], [Ann(v, A, s)], f, s, [x.q]);
  }
  return parse_term_do_call("bind", [A], [v, Lam(x.k, x.i, f, s, x.q)], s);
}
function parse_body(p, col = 0) {
  parse_skip(p);
  const beg = p.pos;
  if (parse_word(p, "match")) {
    const es = parse_terms(p);
    parse_skip(p);
    const ccol = parse_col(p.str, p.pos);
    const rows = [];
    while (ccol > col && parse_at_word(p, "case") && parse_col(p.str, p.pos) >= ccol) {
      const rcol = parse_col(p.str, p.pos);
      parse_word(p, "case");
      const qs = parse_terms(p);
      if (qs.length !== es.length) {
        parse_fail(p, String(es.length) + " patterns (one per scrutinee)");
      }
      const n02 = p.sc.stk.length;
      const pp = qs.map((q2) => parse_patt(p, q2));
      const f2 = parse_body(p, rcol);
      parse_close(p, n02);
      rows.push({ p: pp, f: f2 });
    }
    return { $: "Match", e: es, r: rows, s: parse_span(p, beg) };
  }
  const q = parse_take(p, "-") ? None() : Lone();
  const vs = [];
  let ts = [q.$ === "None" ? Var(parse_name(p), 0, parse_span(p, beg)) : parse_term(p)];
  parse_skip(p);
  while (!parse_nl(p) && (char_is_head(parse_peek(p)) || q.$ === "Lone" && parse_at(p, "+")) && !KEYWORDS.has(p.str.slice(p.pos).match(/^[A-Za-z0-9_.]*/)?.[0] ?? "")) {
    ts.push(parse_term(p));
    parse_skip(p);
  }
  if (q.$ === "Lone" && ts.length === 1 && !(parse_at(p, "=") && !parse_at(p, "=="))) {
    const w = term_write(ts[0]);
    if (w === null || !parse_more(p, parse_col(p.str, beg))) {
      return { $: "Reply", x: ts[0], s: parse_span(p, beg) };
    }
    vs.push(ts[0]);
    ts = [w];
  } else {
    parse_eat(p, "=");
  }
  while (vs.length < ts.length) {
    vs.push(parse_term(p));
  }
  parse_skip(p);
  parse_take(p, ";");
  const n0 = p.sc.stk.length;
  const ks = ts.map((x) => {
    if (ts.length > 1 && x.$ !== "Var") {
      throw Err(p.book, ctx_nil(), "a name (a parallel let binds names; destructure in its body)", undefined, x.s);
    }
    return parse_patt(p, x);
  });
  const f = parse_body(p, col);
  parse_close(p, n0);
  return { $: "Local", k: ks, q, v: vs, f };
}
function term_write(t) {
  const [h, xs] = term_unapply(t);
  if (h.$ === "Ref" && h.k === "Array.set" && xs.length === 4 && xs[1].$ === "Var") {
    return xs[1];
  }
  return null;
}
function parse_more(p, col) {
  return parse_at(p, ";") || p.pos < p.str.length && parse_col(p.str, p.pos) === col;
}
function parse_block(p) {
  parse_skip(p);
  const b = parse_body(p, parse_col(p.str, p.pos) - 1);
  return body_flatten(b, [], () => p.sc.frs++);
}
function parse_terms(p) {
  const xs = [];
  while (true) {
    xs.push(parse_term(p));
    parse_skip(p);
    if (parse_take(p, ":")) {
      return xs;
    }
    parse_take(p, ",");
  }
}
function parse_tele(p, close, tk = []) {
  const tele = [];
  while (true) {
    parse_skip(p);
    if (parse_take(p, close)) {
      return tele;
    }
    if (close === ")" && parse_at(p, "~") && tk.length < tele.length) {
      parse_fail(p, "a plain binder (only leading binders take ~)");
    }
    const ct = close === ")" && parse_take(p, "~");
    const q = ct ? None() : parse_quant(p);
    const beg = p.pos;
    const k = parse_name(p);
    const s = parse_span(p, beg);
    parse_skip(p);
    const bare = q.$ === "Lone" && !parse_at(p, ":");
    if (!bare) {
      parse_eat(p, ":");
    }
    const T = bare ? Qnt(s) : parse_term(p);
    if (ct) {
      tk.push(k);
    }
    tele.push([bare ? None() : q, k, parse_open(p, k), T, s]);
    parse_skip(p);
    parse_take(p, ",");
  }
}
function parse_fresh(p, k) {
  if (p.book.tlds[k] !== undefined) {
    parse_fail(p, "a fresh name (duplicate declaration: " + k + ")");
  }
}
function parse_def(p, book, u = false) {
  parse_word(p, "def");
  const nm = parse_name(p);
  const q = parse_reso(p, nm);
  const tld = book.tlds[q];
  const law = tld?.$ === "Def" && tld.v === null && tld.b !== true && !tld.i ? tld : undefined;
  const k = law ? q : parse_qual(p, nm);
  if (!law) {
    parse_fresh(p, k);
  }
  const n0 = p.sc.stk.length;
  parse_eat(p, "(");
  parse_skip(p);
  if (law && parse_at(p, "~")) {
    parse_fail(p, "a name");
  }
  const tk = [];
  const tele = parse_tele(p, ")", tk);
  parse_skip(p);
  let def;
  if (law) {
    if (tele.some((cell) => cell[3].$ !== "Qnt")) {
      parse_fail(p, "a name");
    }
    if (tele.length < law.x) {
      parse_fail(p, "a name for each ~ clause of the law (" + String(law.x) + ")");
    }
    def = book.tlds[k] = law;
    def.n = tele.length;
  } else {
    if (!parse_take(p, "->")) {
      parse_fail(p, "'->' (a def with no return type fills a law; no law named " + nm + " is in scope)");
    }
    def = book.tlds[k] = { $: "Def", n: tele.length, x: tk.length, T: term_higher(tele_bind(tele, parse_term(p))), v: null };
  }
  def.u ||= u;
  parse_eat(p, ":");
  if (parse_at_word(p, "import")) {
    if (def.x > 0) {
      parse_fail(p, "a body (a template is not foreign)");
    }
    def.i = [];
    while (parse_word(p, "import")) {
      parse_eat(p, '"');
      let eff = "";
      while (parse_peek(p) !== '"' && parse_peek(p) !== "") {
        eff += parse_bump(p);
      }
      parse_eat(p, '"');
      if (!/\.(c|js)$/.test(eff)) {
        parse_fail(p, "a .c or .js path");
      }
      def.i.push(p.dir + eff);
    }
  } else {
    const vars = tele.map((cell) => ({ $: "PVar", k: cell[1], i: cell[2], q: Lone(), s: cell[4] }));
    def.v = term_higher(term_lower(term_higher(body_flatten(parse_body(p), vars, () => p.sc.frs++))));
  }
  parse_close(p, n0);
  book.order.push(k);
}
function parse_book(book, dir, src, ns = "", al = Object.create(null)) {
  const p = { book, dir, str: src, pos: 0, sc: { stk: [], frs: 0 }, ns, al };
  while (true) {
    parse_skip(p);
    if (p.pos >= p.str.length) {
      return book;
    }
    p.sc = { stk: [], frs: 0 };
    if (parse_take(p, "@")) {
      if (!parse_word(p, "unsafe")) {
        parse_fail(p, "'unsafe' (the one decorator)");
      }
      parse_skip(p);
      if (!parse_at_word(p, "def")) {
        parse_fail(p, "'def' (@unsafe marks the def below it)");
      }
      parse_def(p, book, true);
      continue;
    }
    if (parse_at_word(p, "def")) {
      parse_def(p, book);
      continue;
    }
    if (parse_at_word(p, "type")) {
      parse_word(p, "type");
      const k = parse_qual(p, parse_name(p));
      parse_fresh(p, k);
      const n0 = p.sc.stk.length;
      parse_skip(p);
      const params = parse_take(p, "<") ? parse_tele(p, ">") : [];
      if (!parse_word(p, "is")) {
        parse_fail(p, "'is'");
      }
      const K = parse_term(p);
      parse_eat(p, ":");
      const cs = [];
      const g = params.findIndex((cell) => cell[3].$ !== "Qnt");
      book.tlds[k] = { $: "ADT", n: params.length, g: g < 0 ? params.length : g, T: term_higher(tele_bind(params, K)), c: cs };
      while (true) {
        parse_skip(p);
        if (!char_is_head(parse_peek(p)) || ["def", "type", "law"].some((w) => parse_at_word(p, w))) {
          break;
        }
        const c = parse_qual(p, parse_name(p));
        if (book_ctr(book, c) !== null) {
          parse_fail(p, "a fresh constructor name (duplicate declaration: " + c + ")");
        }
        parse_eat(p, "{");
        const n1 = p.sc.stk.length;
        const fs = parse_tele(p, "}");
        const tip = ADT(k, params.map((cell) => Var(cell[1], cell[2])));
        const ctr = { k: c, n: fs.length, T: term_higher(tele_bind(params.concat(fs), tip)) };
        parse_close(p, n1);
        cs.push(ctr);
        book.ctrs[c] = ctr;
      }
      parse_close(p, n0);
      book.order.push(k);
      continue;
    }
    if (parse_at_word(p, "law")) {
      parse_word(p, "law");
      const k = parse_qual(p, parse_name(p));
      parse_fresh(p, k);
      parse_eat(p, ":");
      const n0 = p.sc.stk.length;
      const cls = [];
      let tc = 0;
      while (parse_at_word(p, "for") || parse_at_word(p, "exs")) {
        const all = parse_word(p, "for");
        if (!all) {
          parse_word(p, "exs");
        }
        parse_skip(p);
        if (all && parse_at(p, "~") && tc < cls.length) {
          parse_fail(p, "a plain clause (only leading clauses take ~)");
        }
        const ct = all && parse_take(p, "~");
        const q = ct ? None() : all ? parse_quant(p) : Lone();
        const beg = p.pos;
        const c = parse_name(p);
        const s = parse_span(p, beg);
        if (ct) {
          tc += 1;
        }
        parse_eat(p, ":");
        let A = parse_term(p);
        if (parse_at_word(p, "where")) {
          const beg2 = p.pos;
          parse_word(p, "where");
          const ws = parse_span(p, beg2);
          const n1 = p.sc.stk.length;
          const i = parse_open(p, c);
          const w = parse_term(p);
          parse_close(p, n1);
          A = App(App(Ref("Exists", ws), A, s), Lam(c, i, w, s), s);
        }
        cls.push([all, q, c, parse_open(p, c), A, s]);
      }
      const T = cls.reduceRight((T2, [all, q, c, i, A, s]) => all ? All(q, c, i, A, T2, s) : App(App(Ref("Exists", s), A, s), Lam(c, i, T2, s), s), parse_block(p));
      parse_close(p, n0);
      const n = cls.findIndex((c) => !c[0]);
      book.tlds[k] = { $: "Def", n: n < 0 ? cls.length : n, T: term_higher(T), v: null, x: tc };
      book.order.push(k);
      continue;
    }
    parse_fail(p, "'def', 'type' or 'law'");
  }
}
function body_sub(b, i, v) {
  function scrut(e) {
    if (e.$ === "Var") {
      return e.i !== i ? e : patt_term(v, e.s);
    } else {
      return Sub(i, v, e);
    }
  }
  switch (b.$) {
    case "Match": {
      const es = b.e.map(scrut);
      const rs = b.r.map((row) => ({ p: row.p, f: body_sub(row.f, i, v) }));
      return { $: "Match", e: es, r: rs, s: b.s };
    }
    case "Local": {
      const w = b.v.map(scrut);
      const f = body_sub(b.f, i, v);
      return { $: "Local", k: b.k, q: b.q, v: w, f };
    }
    case "Reply": {
      const x = Sub(i, v, b.x);
      return { $: "Reply", x, s: b.s };
    }
  }
}
function match_flatten(m, vars, fr) {
  if (m.e.length === 0 && m.r.length > 0) {
    return body_flatten(m.r[0].f, vars, fr);
  } else if (m.e.length === 0) {
    throw Err(book_nil(), ctx_nil(), "a case (this match has no row to return)", undefined, m.s);
  } else if (vars.length === 0) {
    let e = m.e[0];
    while (e.$ === "Sub") {
      e = e.f;
    }
    switch (e.$) {
      case "Var": {
        throw Err(book_nil(), ctx_nil(), "a match on a parameter or field (this" + " name is a def or a consumed binder: give the value its own def)", undefined, e.s);
      }
      case "Ctr": {
        throw Err(book_nil(), ctx_nil(), "an undestructed scrutinee (this value is already a constructor: bind its fields directly; if an outer match destructed it, fold the pattern into the outer case)", undefined, m.s);
      }
      default: {
        throw Err(book_nil(), ctx_nil(), "a parameter or field scrutinee (a match cannot scrutinize a computed value: give it its own def)", undefined, e.s ?? m.s);
      }
    }
  } else {
    const x = vars[0];
    const scu = m.e[0];
    const c = m.r.map((row) => row.p[0]).find((q) => q.$ === "PCtr") ?? null;
    const v = vars.find((w) => scu.$ === "Var" && w.i === scu.i);
    if (v !== undefined && c === null && m.r.length > 0) {
      const w = { ...v, q: patt_mark(v, m.r) };
      const rs = m.r.map((row) => {
        const p0 = row.p[0];
        if (p0.$ !== "PVar") {
          throw Err(book_nil(), ctx_nil(), "a variable pattern (this column has no constructor row)", undefined, p0.s);
        }
        return { p: row.p.slice(1), f: body_sub(row.f, p0.i, w) };
      });
      return match_flatten({ $: "Match", e: m.e.slice(1), r: rs, s: m.s }, vars.map((u) => u === v ? w : u), fr);
    } else if (v === x) {
      if (c === null) {
        return Efq(m.s);
      } else {
        const xq = patt_mark(x, m.r);
        const xs = c.x.map((q) => {
          if (q.$ === "PVar") {
            return { ...q, q: quant_join(q.q, xq) };
          }
          const i = fr();
          return { $: "PVar", k: "_" + String(i), i, q: xq, s: q.s };
        });
        const kx = { $: "PCtr", k: c.k, x: xs, s: x.s };
        const ps = m.r.flatMap((row) => {
          const p0 = row.p[0];
          switch (p0.$) {
            case "PCtr": {
              if (p0.k !== c.k) {
                return [];
              }
              const f = body_sub(row.f, x.i, kx);
              return [{ p: [...p0.x, ...row.p.slice(1)], f }];
            }
            case "PVar": {
              const g = body_sub(row.f, p0.i, x);
              const f = body_sub(g, x.i, kx);
              return [{ p: [...xs, ...row.p.slice(1)], f }];
            }
          }
        });
        const pe = xs.map((q) => patt_term(q)).concat(m.e.slice(1));
        const pv = xs.concat(vars.slice(1));
        const pt = match_flatten({ $: "Match", e: pe, r: ps, s: m.s }, pv, fr);
        const ds = m.r.filter((row) => row.p[0].$ !== "PCtr" || row.p[0].k !== c.k);
        const dt = match_flatten({ $: "Match", e: m.e, r: ds, s: m.s }, vars, fr);
        return Mat(c.k, pt, dt, c.s);
      }
    } else {
      const t = match_flatten(m, vars.slice(1), fr);
      return Lam(x.k, x.i, t, x.s, x.q);
    }
  }
}
function patt_mark(x, rows) {
  return rows.map((row) => row.p[0]).reduce((q, p) => p.$ === "PVar" ? quant_join(q, p.q) : q, x.q);
}
function patt_term(q, s) {
  switch (q.$) {
    case "PVar": {
      return Var(q.k, q.i, s ?? q.s);
    }
    case "PCtr": {
      const xs = q.x.map((x) => patt_term(x, s));
      return Ctr(q.k, xs, s ?? q.s);
    }
  }
}
function body_flatten(b, vars, fr) {
  switch (b.$) {
    case "Reply": {
      if (vars.length === 0) {
        return b.x;
      } else {
        const v = vars[0];
        const f = body_flatten(b, vars.slice(1), fr);
        return Lam(v.k, v.i, f, v.s, v.q);
      }
    }
    case "Local": {
      if (b.k.length === 1 && b.k[0].$ === "PCtr") {
        const r = { p: [b.k[0]], f: b.f };
        return match_flatten({ $: "Match", e: [b.v[0]], r: [r], s: b.v[0].s }, vars, fr);
      }
      const ws = b.k;
      let g = body_flatten(b.f, ws, fr);
      for (const w of ws) {
        if (g.$ !== "Lam") {
          throw Err(book_nil(), ctx_nil(), "a parameter or field scrutinee (a match cannot scrutinize a local binder: give it its own def)", undefined, w.s);
        }
        g = g.f;
      }
      const x = Let(ws.map((w) => w.k), ws.map((w) => w.i), b.v, g, ws[0].s, ws.map((w) => quant_dem(b.q, w.q)));
      return body_flatten({ $: "Reply", x }, vars, fr);
    }
    case "Match": {
      return match_flatten(b, vars, fr);
    }
  }
}
function term_wnf(book, term) {
  const frs = [];
  let tm = term;
  let lhs = null;
  main:
    while (true) {
      focus:
        switch (tm.$) {
          case "Var": {
            if (tm.v === undefined) {
              break focus;
            } else {
              if (tm.i === -1) {
                frs.push({ $: "VAR", l: tm, a: tm.v.$ === "Ann" ? tm.v : undefined });
              }
              lhs = null;
              tm = tm.v;
              continue main;
            }
          }
          case "Ann": {
            tm = tm.x;
            continue main;
          }
          case "Min": {
            frs.push({ $: "MNA", b: tm.b, s: tm.s });
            tm = tm.a;
            continue main;
          }
          case "Let": {
            const l = tm;
            tm = l.f(l.v.map((v, j) => term_cell(v, l.k[j])));
            continue main;
          }
          case "App": {
            frs.push({ $: "APP", x: term_cell(tm.x), s: tm.s });
            lhs = null;
            tm = tm.f;
            continue main;
          }
          case "Lam": {
            if (frs.length === 0 || frs[frs.length - 1].$ !== "APP") {
              break focus;
            } else {
              const fr = frs.pop();
              if (lhs !== null && lhs.n === 0) {
                lhs = null;
              } else if (lhs !== null) {
                const pt = lhs.t;
                const pn = lhs.n;
                lhs = { t: () => term_apply(pt(), fr.x, fr.s), n: pn - 1 };
              }
              tm = tm.f(fr.x);
              continue main;
            }
          }
          case "Mat": {
            if (frs.length === 0 || frs[frs.length - 1].$ !== "APP") {
              break focus;
            } else {
              const fr = frs.pop();
              frs.push({ $: "MAT", t: tm, e: fr.x, lhs, s: fr.s });
              tm = fr.x;
              lhs = null;
              continue main;
            }
          }
          case "Efq": {
            if (lhs !== null && lhs.n > 0 && frs.length > 0 && frs[frs.length - 1].$ === "APP") {
              tm = lhs.t();
            }
            break focus;
          }
          case "Rwt": {
            const e = term_wnf(book, tm.e);
            if (e.$ === "Rfl") {
              tm = tm.f;
              continue main;
            }
            break focus;
          }
          case "Ref": {
            const tld = book.tlds[tm.k];
            if (tld === undefined) {
              break focus;
            }
            if (tld.$ === "ADT") {
              if (tld.n === 0) {
                tm = ADT(tm.k, [], tm.s);
              }
              break focus;
            }
            let run = 0;
            while (run < tld.n && run < frs.length && frs[frs.length - 1 - run].$ === "APP") {
              run += 1;
            }
            if (run < tld.n || tld.v === null) {
              break focus;
            }
            const rf = tm;
            lhs = { t: () => rf, n: tld.n };
            tm = tld.v;
            continue main;
          }
          default: {
            break focus;
          }
        }
      lhs = null;
      back:
        while (true) {
          const fr = frs.pop();
          if (fr === undefined) {
            return tm;
          } else {
            switch (fr.$) {
              case "VAR": {
                switch (tm.$) {
                  case "Ctr":
                    tm = Ctr(tm.k, tm.x.map((x) => term_cell(x)), tm.s);
                    break;
                  case "ADT":
                    tm = ADT(tm.k, tm.x.map((x) => term_cell(x)), tm.s, tm.r);
                    break;
                  case "All":
                    tm = All(tm.q, tm.k, tm.i, term_cell(tm.A), tm.B, tm.s);
                    break;
                  case "Mat":
                    tm = Mat(tm.k, term_cell(tm.h), term_cell(tm.m), tm.s);
                    break;
                  case "Eql":
                    tm = Eql(term_cell(tm.a), term_cell(tm.b), term_cell(tm.T), tm.s);
                    break;
                  case "Min":
                    tm = Min(term_cell(tm.a), term_cell(tm.b), tm.s);
                    break;
                  case "Typ":
                    tm = Typ(term_cell(tm.g), tm.s);
                    break;
                  default:
                    break;
                }
                fr.l.v = fr.a === undefined ? tm : Ann(tm, term_cell(fr.a.T), fr.a.s);
                fr.l.i = -2;
                continue main;
              }
              case "APP": {
                tm = term_apply(tm, fr.x, fr.s);
                continue back;
              }
              case "MNA": {
                if (tm.$ === "Qua" && tm.q.$ === "Many") {
                  tm = fr.b;
                  continue main;
                }
                if (tm.$ === "Qua" && tm.q.$ === "None") {
                  continue back;
                }
                frs.push({ $: "MNB", a: tm, s: fr.s });
                tm = fr.b;
                continue main;
              }
              case "MNB": {
                if (tm.$ === "Qua" && tm.q.$ === "Many") {
                  tm = fr.a;
                } else if (tm.$ !== "Qua" || tm.q.$ === "Lone" && fr.a.$ !== "Qua") {
                  tm = Min(fr.a, tm, fr.s);
                }
                continue back;
              }
              case "MAT": {
                if (tm.$ === "Ctr") {
                  const ctr = tm;
                  let t = fr.t;
                  walk:
                    while (true) {
                      switch (t.$) {
                        case "Ann": {
                          t = t.x;
                          continue walk;
                        }
                        case "Mat": {
                          if (t.k === ctr.k) {
                            const fl = fr.lhs;
                            if (fl === null) {
                              lhs = null;
                            } else {
                              lhs = { t: () => lhs_ext(fl.t(), ctr.k, ctr.x.length), n: fl.n - 1 + ctr.x.length };
                            }
                            for (let j = ctr.x.length - 1;j >= 0; j--) {
                              frs.push({ $: "APP", x: term_cell(ctr.x[j]) });
                            }
                            tm = t.h;
                            continue main;
                          } else {
                            t = t.m;
                            continue walk;
                          }
                        }
                        case "Efq": {
                          tm = term_apply(fr.lhs === null ? fr.t : fr.lhs.t(), fr.e, fr.s);
                          continue back;
                        }
                        default: {
                          lhs = fr.lhs;
                          frs.push({ $: "APP", x: ctr });
                          tm = t;
                          continue main;
                        }
                      }
                    }
                } else {
                  tm = term_apply(fr.lhs === null ? fr.t : fr.lhs.t(), fr.e, fr.s);
                  continue back;
                }
              }
            }
          }
        }
    }
}
function term_snf(book, term) {
  const tm = term_wnf(book, term);
  switch (tm.$) {
    case "Var": {
      return Var(tm.k, tm.i, tm.s);
    }
    case "Ref": {
      return Ref(tm.k, tm.s, tm.b);
    }
    case "Sub": {
      return Sub(tm.i, tm.v.$ === "PVar" || tm.v.$ === "PCtr" ? tm.v : term_snf(book, tm.v), term_snf(book, tm.f), tm.s);
    }
    case "Typ": {
      return Typ(term_snf(book, tm.g), tm.s);
    }
    case "Qnt":
    case "Qua": {
      return tm;
    }
    case "Min": {
      return Min(term_snf(book, tm.a), term_snf(book, tm.b), tm.s);
    }
    case "All": {
      return All(tm.q, tm.k, tm.i, term_snf(book, tm.A), (x) => {
        return term_snf(book, tm.B(x));
      }, tm.s);
    }
    case "Lam": {
      return Lam(tm.k, tm.i, (x) => {
        return term_snf(book, tm.f(x));
      }, tm.s);
    }
    case "App": {
      return App(tm.f.$ === "Ref" ? tm.f : term_snf(book, tm.f), term_snf(book, tm.x), tm.s);
    }
    case "ADT": {
      return ADT(tm.k, tm.x.map((x) => term_snf(book, x)), tm.s, tm.r);
    }
    case "Ctr": {
      return Ctr(tm.k, tm.x.map((x) => term_snf(book, x)), tm.s);
    }
    case "Mat": {
      return Mat(tm.k, term_snf(book, tm.h), term_snf(book, tm.m), tm.s);
    }
    case "Efq": {
      return Efq(tm.s);
    }
    case "Eql": {
      return Eql(term_snf(book, tm.a), term_snf(book, tm.b), term_snf(book, tm.T), tm.s);
    }
    case "Rfl": {
      return Rfl(tm.s);
    }
    case "Rwt": {
      return Rwt(term_snf(book, tm.e), term_snf(book, tm.p), term_snf(book, tm.f), tm.s);
    }
    case "Hol": {
      return Hol(tm.k, tm.s);
    }
  }
}
function term_compare(mode, book, lhs, rhs, dep = 0) {
  if (lhs === rhs) {
    return true;
  }
  const a = term_wnf(book, lhs);
  const b = term_wnf(book, rhs);
  if (a === b) {
    return true;
  }
  if (a.$ === "Lam" || b.$ === "Lam") {
    const k = a.$ === "Lam" ? a.k : b.k;
    const x = Var(k, dep);
    return term_compare(mode, book, term_apply(a, x), term_apply(b, x), dep + 1);
  }
  switch (a.$) {
    case "Var": {
      return b.$ === "Var" && a.i === b.i;
    }
    case "Ref": {
      return b.$ === "Ref" && a.k === b.k;
    }
    case "Typ": {
      if (b.$ !== "Typ") {
        return false;
      }
      if (mode === "EQ") {
        return term_compare("EQ", book, a.g, b.g, dep);
      }
      const g = term_wnf(book, a.g);
      const h = term_wnf(book, b.g);
      if (g.$ === "Qua" && g.q.$ === "Many" || h.$ === "Qua" && h.q.$ !== "Many") {
        return true;
      }
      if (g.$ === "Min") {
        const fa = term_compare("LE", book, Typ(g.a), b, dep);
        const fb = term_compare("LE", book, Typ(g.b), b, dep);
        return fa && fb;
      }
      if (h.$ === "Min") {
        const fa = term_compare("LE", book, a, Typ(h.a), dep);
        const fb = term_compare("LE", book, a, Typ(h.b), dep);
        return fa || fb;
      }
      return term_compare("LE", book, g, h, dep);
    }
    case "Qnt": {
      return b.$ === "Qnt";
    }
    case "Qua": {
      return b.$ === "Qua" && a.q.$ === b.q.$;
    }
    case "Min": {
      return b.$ === "Min" && term_compare("EQ", book, a.a, b.a, dep) && term_compare("EQ", book, a.b, b.b, dep);
    }
    case "All": {
      const x = Var(a.k, dep);
      return b.$ === "All" && a.q.$ === b.q.$ && term_compare(mode, book, b.A, a.A, dep) && term_compare(mode, book, a.B(x), b.B(x), dep + 1);
    }
    case "App": {
      return b.$ === "App" && term_compare("EQ", book, a.f, b.f, dep) && term_compare("EQ", book, a.x, b.x, dep);
    }
    case "ADT": {
      if (b.$ !== "ADT" || a.k !== b.k || a.x.length !== b.x.length) {
        return false;
      }
      if (mode === "EQ" && a.r.length !== b.r.length) {
        return false;
      }
      return b.r.every((c) => a.r.includes(c)) && a.x.every((x, j) => term_compare("EQ", book, x, b.x[j], dep));
    }
    case "Ctr": {
      return b.$ === "Ctr" && a.k === b.k && a.x.length === b.x.length && a.x.every((x, j) => term_compare("EQ", book, x, b.x[j], dep));
    }
    case "Mat": {
      return b.$ === "Mat" && a.k === b.k && term_compare("EQ", book, a.h, b.h, dep) && term_compare("EQ", book, a.m, b.m, dep);
    }
    case "Efq": {
      return b.$ === "Efq";
    }
    case "Eql": {
      return b.$ === "Eql" && term_compare("EQ", book, a.a, b.a, dep) && term_compare("EQ", book, a.b, b.b, dep) && term_compare("EQ", book, a.T, b.T, dep);
    }
    case "Rfl": {
      return b.$ === "Rfl";
    }
    case "Hol": {
      return b.$ === "Hol" && a.k === b.k;
    }
    case "Rwt": {
      return b.$ === "Rwt" && term_compare("EQ", book, a.e, b.e, dep) && term_compare("EQ", book, a.p, b.p, dep) && term_compare("EQ", book, a.f, b.f, dep);
    }
    default: {
      return false;
    }
  }
}
function term_infer(book, lhs, tm, qt, ctx, d, sp = []) {
  switch (tm.$) {
    case "Var": {
      if (tm.i < 0 && tm.v !== undefined) {
        return term_infer(book, lhs, term_force(tm), qt, ctx, d, sp);
      }
      const ann = pmap_get(ctx, tm.i);
      if (ann === null) {
        throw Err(book, ctx, "a bound variable", tm, tm.s, lhs.def);
      } else {
        return Infer(Var(tm.k, tm.i, tm.s), ann.T, pmap_set(uses_nil(), tm.i, qt));
      }
    }
    case "Ref": {
      const tld = book.tlds[tm.k];
      if (tld === undefined) {
        throw Err(book, ctx, "a defined name", tm, tm.s, lhs.def);
      }
      let k = tm.k;
      let x = 0;
      let def = tld;
      switch (qt.$) {
        case "None": {
          break;
        }
        default: {
          const gen = tld.$ === "Def" && tld.x > 0 && !book.tlds[lhs.def].x ? tld : null;
          if (tld.$ === "Def" && tld.v === null && !tld.i && (tld.b !== true || gen !== null) && k !== lhs.def) {
            throw Err(book, ctx, "a filled definition (an unfilled law is a dead claim: live code cannot use it)", tm, tm.s, lhs.def);
          }
          if (gen !== null) {
            k = def_inst(book, lhs, tm, gen, sp, ctx, d);
            def = book.tlds[k];
            x = gen.x;
            sp = sp.slice(x);
          }
          if (k === lhs.def && lhs.u !== true) {
            const cols = term_unapply(lhs.t)[1];
            let ord = "EQ";
            for (let j = 0;j < cols.length && j < sp.length && ord === "EQ"; j++) {
              ord = term_descend(lhs.qs[j], sp[j], cols[j]);
            }
            if (ord !== "LT") {
              throw Err(book, ctx, "a decreasing self-call (arguments are read left to right: each passed unchanged until one shrinks)", tm, tm.s, lhs.def);
            }
          }
          break;
        }
      }
      if (def.$ === "ADT" && def.n > 0) {
        throw Err(book, ctx, "a family instance (write " + tm.k + "<..>)", tm, tm.s, lhs.def);
      }
      return Infer(Ref(k, tm.s, tm.b), def.T, uses_nil(), x);
    }
    case "Typ": {
      const g_chk = term_check(book, lhs, tm.g, None(), Qnt(tm.s), ctx, d);
      return Infer(Typ(g_chk.tm, tm.s), Typ(Qua(Lone()), tm.s), uses_nil());
    }
    case "Qnt": {
      return Infer(Qnt(tm.s), Typ(Qua(Lone()), tm.s), uses_nil());
    }
    case "Qua": {
      return Infer(Qua(tm.q, tm.s), Qnt(tm.s), uses_nil());
    }
    case "Min": {
      const a_chk = term_check(book, lhs, tm.a, qt, Qnt(tm.s), ctx, d);
      const b_chk = term_check(book, lhs, tm.b, qt, Qnt(tm.s), ctx, d);
      return Infer(Min(a_chk.tm, b_chk.tm, tm.s), Qnt(tm.s), uses_add(a_chk.us, b_chk.us));
    }
    case "All": {
      const B_ctx = ctx_bind(ctx, d, tm.q, tm.k, tm.A);
      const A_chk = term_check(book, lhs, tm.A, None(), Typ(Qua(lhs_kind(lhs, tm.q)), tm.s), ctx, d);
      const B_chk = term_check(book, lhs, tm.B(Var(tm.k, d)), None(), Typ(Qua(Lone()), tm.s), B_ctx, d + 1);
      return Infer(All(tm.q, tm.k, d, A_chk.tm, B_chk.tm, tm.s), Typ(Qua(Lone()), tm.s), uses_nil());
    }
    case "App": {
      const f_inf = term_infer(book, lhs, tm.f, qt, ctx, d, [tm.x, ...sp]);
      if (f_inf.x) {
        return { ...f_inf, x: f_inf.x - 1 };
      }
      const f_wnf = term_wnf(book, f_inf.ty);
      if (f_wnf.$ !== "All") {
        throw Err(book, ctx, "a function type", f_inf.ty, tm.s, lhs.def);
      }
      const x_chk = term_check(book, lhs, tm.x, quant_dem(f_wnf.q, qt), f_wnf.A, ctx, d);
      return Infer(App(f_inf.tm, x_chk.tm, tm.s), f_wnf.B(tm.x), uses_add(f_inf.us, x_chk.us));
    }
    case "ADT": {
      const adt = book_adt(book, tm, ctx, lhs.def);
      if (tm.x.length !== adt.n) {
        throw Err(book, ctx, tm.k + " with " + String(adt.n) + (adt.n === 1 ? " parameter" : " parameters"), tm, tm.s, lhs.def);
      }
      const { xs, us, tel } = tele_check(book, lhs, adt.T, tm.x, qt, ctx, d, tm.s);
      return Infer(ADT(tm.k, xs, tm.s, tm.r), tel, us);
    }
    case "Eql": {
      const T_chk = term_check(book, lhs, tm.T, None(), Typ(Qua(Lone()), tm.s), ctx, d);
      const a_chk = term_check(book, lhs, tm.a, None(), tm.T, ctx, d);
      const b_chk = term_check(book, lhs, tm.b, None(), tm.T, ctx, d);
      return Infer(Eql(a_chk.tm, b_chk.tm, T_chk.tm, tm.s), Typ(Qua(Many()), tm.s), uses_nil());
    }
    case "Ann": {
      term_check(book, lhs, tm.T, None(), Typ(Qua(Lone()), tm.s), ctx, d);
      const x_chk = term_check(book, lhs, tm.x, qt, tm.T, ctx, d);
      return { tm: x_chk.tm, ty: tm.T, us: x_chk.us };
    }
    default: {
      if (tm.$ === "Ctr" && book_ctr(book, tm.k) === null) {
        throw Err(book, ctx, "a declared constructor", tm, tm.s, lhs.def);
      }
      throw Err(book, ctx, "an annotated term (cannot infer)", tm, tm.s, lhs.def);
    }
  }
}
function term_check_kind(book, lhs, T, q, ctx, d, s) {
  const kind = Typ(Qua(lhs_kind(lhs, q)), s);
  try {
    term_check(book, lhs, T, None(), kind, ctx, d);
  } catch (e) {
    const err = e;
    throw err?.$ === "Err" && err.exp === kind ? { ...err, spn: s ?? err.spn } : e;
  }
}
function term_check(book, lhs, tm, qt, ty, ctx, d) {
  switch (tm.$) {
    case "Var": {
      if (tm.i < 0 && tm.v !== undefined) {
        return term_check(book, lhs, term_force(tm), qt, ty, ctx, d);
      }
      break;
    }
    case "Lam": {
      const t_wnf = term_wnf(book, ty);
      if (t_wnf.$ !== "All") {
        throw Err(book, ctx, ty, typeless_show(book, ctx, tm), tm.s, lhs.def);
      }
      const x = Var(tm.k, d);
      let f_lhs = lhs;
      if (lhs.n > 0) {
        f_lhs = { ...lhs, t: term_apply(lhs.t, x), n: lhs.n - 1 };
      }
      let q = t_wnf.q;
      if (tm.q?.$ === "Many" && q.$ === "Lone") {
        q = tm.q;
        term_check_kind(book, lhs, t_wnf.A, q, ctx, d, tm.s);
      }
      const f_ctx = ctx_bind(ctx, d, q, tm.k, t_wnf.A);
      const f_chk = term_check(book, f_lhs, tm.f(x), qt, t_wnf.B(x), f_ctx, d + 1);
      quant_used(book, ctx, tm.k, q, uses_get(f_chk.us, d), tm.s, lhs.def);
      return Check(Lam(tm.k, d, f_chk.tm, tm.s), ty, uses_del(f_chk.us, d));
    }
    case "Let": {
      const n = tm.k.length;
      const vx = [];
      let us = uses_nil();
      let f_ctx = ctx;
      for (let j = 0;j < n; j++) {
        const v_dem = quant_dem(tm.q[j], qt);
        const v_inf = term_infer(book, lhs, tm.v[j], v_dem, ctx, d);
        term_check_kind(book, lhs, v_inf.ty, tm.q[j], ctx, d, tm.s);
        vx.push(v_inf.tm);
        us = uses_add(us, v_inf.us);
        f_ctx = ctx_bind(f_ctx, d + j, tm.q[j], tm.k[j], v_inf.ty);
      }
      const xs = tm.k.map((k, j) => Var(k, d + j, undefined, tm.v[j]));
      const f_chk = term_check(book, lhs, tm.f(xs), qt, ty, f_ctx, d + n);
      let fu = f_chk.us;
      for (let j = 0;j < n; j++) {
        quant_used(book, ctx, tm.k[j], tm.q[j], uses_get(fu, d + j), tm.s, lhs.def);
        fu = uses_del(fu, d + j);
      }
      return Check(Let(tm.k, xs.map((_, j) => d + j), vx, f_chk.tm, tm.s, tm.q), ty, uses_add(us, fu));
    }
    case "Ctr": {
      const t_wnf = term_wnf(book, ty);
      if (t_wnf.$ !== "ADT") {
        const fam = book_ctr(book, tm.k) === null ? null : book_fam(book, tm.k);
        throw Err(book, ctx, ty, fam === null ? typeless_show(book, ctx, tm) : Ref(fam, tm.s), tm.s, lhs.def);
      }
      const adt = book_adt(book, t_wnf, ctx, lhs.def);
      const ctr = ctrs_find(adt.c, tm.k);
      if (ctr === null) {
        if (book_ctr(book, tm.k) === null) {
          throw Err(book, ctx, "a declared constructor (" + t_wnf.k + " declares " + adt.c.map((c) => c.k).join(", ") + ")", tm, tm.s, lhs.def);
        }
        throw Err(book, ctx, ty, Ref(book_fam(book, tm.k), tm.s), tm.s, lhs.def);
      }
      if (tm.x.length !== ctr.n) {
        throw Err(book, ctx, tm.k + " with " + String(ctr.n) + (ctr.n === 1 ? " field" : " fields"), tm, tm.s, lhs.def);
      }
      const tel = tele_fill(book, ctr.T, t_wnf.x, ctx, lhs.def, tm.s);
      const { xs, us } = tele_check(book, lhs, tel, tm.x, qt, ctx, d, tm.s);
      return Check(Ctr(tm.k, xs, tm.s), ty, us);
    }
    case "Mat":
    case "Efq": {
      const t_wnf = term_wnf(book, ty);
      if (t_wnf.$ !== "All") {
        throw Err(book, ctx, ty, typeless_show(book, ctx, tm), tm.s, lhs.def);
      }
      if (qt.$ !== "None" && t_wnf.q.$ === "None") {
        throw Err(book, ctx, "a live scrutinee (a - scrutinee matches only in a dead region)", undefined, tm.s, lhs.def);
      }
      const a_wnf = term_wnf(book, t_wnf.A);
      if (a_wnf.$ !== "ADT") {
        throw Err(book, ctx, "a datatype", t_wnf.A, tm.s, lhs.def);
      }
      const rem = book_adt(book, a_wnf, ctx, lhs.def).c;
      switch (tm.$) {
        case "Efq": {
          if (rem.length !== 0 && !ctx_dead(book, ctx)) {
            throw Err(book, ctx, "cases for " + rem.map((c) => c.k).join(", "), tm, tm.s, lhs.def);
          }
          return Check(Efq(tm.s), ty, uses_nil());
        }
        case "Mat": {
          let term_check_mat_goal = function(cur, n, xs) {
            if (n === 0) {
              return t_all.B(Ctr(b.k, xs, b.s));
            } else {
              const c_all = tele_head(book, cur, ctx, lhs.def, b.s);
              const c_dem = c_all.q.$ === "None" ? None() : c_all.q.$ === "Lone" ? t_all.q : quant_add(t_all.q, t_all.q);
              return All(c_dem, c_all.k, c_all.i, c_all.A, (x) => {
                return term_check_mat_goal(c_all.B(x), n - 1, xs.concat([x]));
              }, b.s);
            }
          };
          const b = tm;
          const t_all = t_wnf;
          const ctr = ctrs_find(rem, tm.k);
          if (ctr === null) {
            throw Err(book, ctx, "a constructor of " + a_wnf.k + " (missing, or already matched)", tm, tm.s, lhs.def);
          }
          const tel = tele_fill(book, ctr.T, a_wnf.x, ctx, lhs.def, tm.s);
          let h_lhs = lhs;
          if (lhs.n > 0) {
            h_lhs = { ...lhs, t: lhs_ext(lhs.t, tm.k, ctr.n), n: lhs.n - 1 + ctr.n };
          }
          const h_chk = term_check(book, h_lhs, tm.h, qt, term_check_mat_goal(tel, ctr.n, []), ctx, d);
          const m_gol = All(t_wnf.q, t_wnf.k, t_wnf.i, ADT(a_wnf.k, a_wnf.x, tm.s, a_wnf.r.concat([ctr.k])), t_wnf.B, tm.s);
          const m_chk = term_check(book, lhs, tm.m, qt, m_gol, ctx, d);
          return Check(Mat(tm.k, h_chk.tm, m_chk.tm, tm.s), ty, pmap_union(h_chk.us, m_chk.us, quant_join));
        }
      }
    }
    case "Rfl": {
      const t_wnf = term_wnf(book, ty);
      if (t_wnf.$ !== "Eql") {
        throw Err(book, ctx, ty, typeless_show(book, ctx, tm), tm.s, lhs.def);
      }
      if (!term_compare("EQ", book, t_wnf.a, t_wnf.b, d)) {
        throw Err(book, ctx, t_wnf.a, t_wnf.b, tm.s, lhs.def);
      }
      return Check(Rfl(tm.s), ty, uses_nil());
    }
    case "Hol": {
      if (tm.k === "TODO") {
        return Check(Hol(tm.k, tm.s), ty, uses_nil());
      }
      throw Err(book, ctx, ty, tm, tm.s, lhs.def);
    }
    case "Rwt": {
      const e_inf = term_infer(book, lhs, tm.e, qt, ctx, d);
      const e_wnf = term_wnf(book, e_inf.ty);
      if (e_wnf.$ !== "Eql") {
        throw Err(book, ctx, "an equation {a == b : T}", e_inf.ty, tm.e.s ?? tm.s, lhs.def);
      }
      const p_typ = All(Lone(), "_", 0, e_wnf.T, (x) => All(Lone(), "e", 0, Eql(e_wnf.a, x, e_wnf.T), () => Typ(Qua(Lone())), tm.s), tm.s);
      const p_chk = term_check(book, lhs, tm.p, None(), p_typ, ctx, d);
      const b_gol = term_apply(term_apply(tm.p, e_wnf.b), tm.e);
      if (!term_compare("LE", book, b_gol, ty, d)) {
        throw Err(book, ctx, ty, b_gol, tm.s, lhs.def);
      }
      const a_gol = term_apply(term_apply(tm.p, e_wnf.a), Rfl(tm.s));
      const f_chk = term_check(book, lhs, tm.f, qt, a_gol, ctx, d);
      return Check(Rwt(e_inf.tm, p_chk.tm, f_chk.tm, tm.s), ty, uses_add(e_inf.us, f_chk.us));
    }
    default: {
      break;
    }
  }
  const x_inf = term_infer(book, lhs, tm, qt, ctx, d);
  if (term_compare("LE", book, x_inf.ty, ty, d)) {
    return { tm: x_inf.tm, us: x_inf.us };
  }
  throw Err(book, ctx, ty, x_inf.ty, tm.s, lhs.def);
}
function def_check(book, k, def, z) {
  const qs = tele_unbind(book, def.T).doms.map((dom) => dom[0]).slice(0, def.n);
  while (qs.length < def.n) {
    qs.push(Lone());
  }
  const gen = def.x === 0 ? book : { ...book, tlds: Object.create(book.tlds) };
  let [t, v, T] = [Ref(k), def.v, def.T];
  for (let j = 0;j < def.x; j++) {
    const h = tele_head(gen, T, ctx_nil(), k);
    const o = k + "~" + h.k;
    gen.tlds[o] = { $: "Def", n: 0, x: 0, T: h.A, v: null, b: true };
    t = App(t, Ref(o));
    v = term_apply(v, Ref(o));
    T = h.B(Ref(o));
  }
  return term_check(gen, { t, n: def.n - def.x, def: k, qs, u: def.u, z }, v, Lone(), T, ctx_nil(), 0).tm;
}
function def_inst(book, lhs, tm, def, sp, ctx, d) {
  const xs = sp.slice(0, def.x);
  if (xs.length < def.x) {
    throw Err(book, ctx, "a template applied to closed ~ arguments (a def parameter is not comptime)", tm, tm.s, lhs.def);
  }
  let T = def.T;
  for (const a of xs) {
    const h = tele_head(book, T, ctx, lhs.def, tm.s);
    try {
      term_check(book, lhs, a, None(), h.A, ctx_nil(), d);
    } catch (e) {
      const v = e?.obs;
      if (typeof v === "object" && v.$ === "Var" && v.i >= 0 && v.i < d) {
        throw Err(book, ctx, "a template applied to closed ~ arguments (" + v.k + " is a variable here, not comptime: pass it at run time)", tm, tm.s, lhs.def);
      }
      throw e;
    }
    T = h.B(a);
  }
  const key2 = xs.map((a) => term_key(term_lower(a))).join(`
`);
  if (key2.length > 32768) {
    throw Err(book, ctx, "a ~ argument that stops growing", tm, tm.s, lhs.def);
  }
  const is = book.tmps[tm.k] ??= Object.create(null);
  if (is[key2] === undefined) {
    const z = (lhs.z ?? 0) + 1;
    if (z > 64) {
      throw Err(book, ctx, "a template that stops instantiating itself (64 levels at most)", tm, tm.s, lhs.def);
    }
    const o = is[key2] = tm.k + "~" + String(Object.keys(is).length);
    const inst = { $: "Def", n: def.n - def.x, x: 0, T, v: xs.reduce((v, a) => term_apply(v, a), def.v), u: def.u };
    book.tlds[o] = { ...inst, v: null };
    inst.e = def_check(book, o, inst, z);
    book.tlds[o] = inst;
  }
  return is[key2];
}
function book_valid(book, done = 0) {
  const tlds = book.tlds;
  const last = new Map;
  for (let i = 0;i < book.order.length; i++) {
    last.set(book.order[i], i);
  }
  book.tlds = Object.create(null);
  book.ctrs = Object.create(null);
  for (const k in tlds) {
    if (!last.has(k)) {
      book.tlds[k] = tlds[k];
    }
  }
  for (let i = 0;i < book.order.length; i++) {
    const k = book.order[i];
    const tld = tlds[k];
    const fin = last.get(k) === i;
    if (tld.$ === "ADT") {
      book.tlds[k] = tld;
      for (const c of tld.c) {
        book.ctrs[c.k] = c;
      }
      if (i >= done) {
        term_check(book, { t: Ref(k), n: 0, def: k, qs: [] }, tld.T, None(), Typ(Qua(Lone())), ctx_nil(), 0);
        const { doms, ret: kind } = tele_unbind(book, tld.T);
        if (kind.$ !== "Typ") {
          let ctx = ctx_nil();
          for (const [d, [q, x, A]] of doms.entries()) {
            ctx = ctx_bind(ctx, d, q, x, A);
          }
          throw Err(book, ctx, "a kind (type " + k + "<..> is Kind(g))", kind, kind.s ?? tld.T.s, k);
        }
        for (const ctr of tld.c) {
          let tel = ctr.T;
          let ctx = ctx_nil();
          for (let d = 0;d < tld.n + ctr.n; d++) {
            const t_all = tele_head(book, tel, ctx, ctr.k);
            let goal = Typ(Qua(t_all.q));
            if (d >= tld.n && t_all.q.$ === "Lone") {
              goal = kind;
            }
            term_check(book, { t: Ref(ctr.k), n: 0, def: ctr.k, qs: [] }, t_all.A, None(), goal, ctx, d);
            ctx = ctx_bind(ctx, d, t_all.q, t_all.k, t_all.A);
            tel = t_all.B(Var(t_all.k, d));
          }
          const exp = "a telescope tipped at " + k + " applied to its own parameters";
          const tip = term_wnf(book, tel);
          if (tip.$ !== "ADT" || tip.k !== k || tip.x.length !== tld.n || tip.r.length !== 0) {
            throw Err(book, ctx, exp, tip, undefined, ctr.k);
          }
          for (let d = 0;d < tld.n; d++) {
            const x = term_wnf(book, tip.x[d]);
            if (x.$ !== "Var" || x.i !== d) {
              throw Err(book, ctx, exp, tip, undefined, ctr.k);
            }
          }
        }
      }
      continue;
    }
    const dec = { ...tld, v: null };
    if (i < done) {
      book.tlds[k] = fin ? tld : dec;
      continue;
    }
    if (fin && tld.v === null && tld.b !== true && !tld.i) {
      book.open += 1;
    }
    book.tlds[k] = dec;
    const def = fin ? tld : dec;
    term_check(book, { t: Ref(k), n: 0, def: k, qs: [], u: def.u }, def.T, None(), Typ(Qua(Lone())), ctx_nil(), 0);
    if (def.i) {
      let tel = term_strip(def.T);
      for (let d = 0;tel.$ === "All"; d++) {
        tel = term_strip(tel.B(Var(tel.k, d)));
      }
      const [h] = term_unapply(tel);
      const io = book.tlds["IO"];
      if (h.$ !== "Ref" || h.k !== "IO" || io === undefined || io.$ !== "Def" || io.b !== true) {
        throw Err(book, ctx_nil(), "a foreign definition returning base IO(...) directly (return type aliases are not unfolded)", k, tel.s, k);
      }
    }
    if (def.v !== null) {
      def.e = def_check(book, k, def);
    }
    book.tlds[k] = def;
  }
}

// bendWorker.ts
function showError(error) {
  if (error instanceof RangeError) {
    return "Error: the machine stack overflowed (deep recursion or a literal that is too large).";
  }
  const bendError = error;
  return bendError?.$ === "Err" ? err_show(bendError) : String(error);
}
function projectPath(path) {
  if (path.startsWith("/") || path.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Invalid project path: ${path}`);
  }
  return `/project/${path}`;
}
function mountProject(files2) {
  for (const [path, source] of Object.entries(files2))
    mount(projectPath(path), source);
}
async function run(entry, files2) {
  if (files2[entry] === undefined)
    throw new Error(`Missing entry file: ${entry}`);
  mountProject(files2);
  const book = book_nil();
  await book_load(book, projectPath(entry), "", new Map);
  book_valid(book);
  const todos = book.hols + book.open;
  if (todos > 0) {
    throw new Error(`${todos} TODO${todos === 1 ? "" : "s"} found. The code is incomplete.`);
  }
  const unsafe = Object.entries(book.tlds).filter(([name, tld]) => tld.$ === "Def" && (tld.u === true || name.includes("~"))).length;
  const checked = unsafe === 0 ? "All terms check." : `All terms check, with ${unsafe} unsafe annotation${unsafe === 1 ? "" : "s"}.`;
  const main = book.tlds.main;
  if (main === undefined || main.$ !== "Def" || main.v === null)
    return checked;
  const value = term_snf(book, main.v);
  return checked + `
` + term_show(term_lower(value));
}
function importsOf(source) {
  return [...source.matchAll(/^\s*import\s+(\S+)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/gm)].map((match) => ({
    module: match[1].replace(/^\.\//, "").replace(/\.bend$/, ""),
    alias: match[2]
  }));
}
function importedName(source, token) {
  const [prefix, ...rest] = token.split(".");
  const imported = importsOf(source).find((item) => item.alias === prefix);
  if (imported === undefined)
    return token;
  return imported.module + (rest.length === 0 ? "" : "." + rest.join("."));
}
async function typeOf(request) {
  mountProject(request.files);
  const file = request.document.kind === "project" ? projectPath(request.document.path) : `/home/web/.bend/lib/${request.document.hash}/${request.document.path}`;
  const book = book_nil();
  await book_load(book, file, "", new Map);
  const source = readFileSync(file, "utf8");
  const name = importedName(source, request.token);
  const item = book.tlds[name] ?? book.ctrs[name];
  if (item === undefined)
    return;
  let type = term_show(term_lower(item.T));
  for (const imported of importsOf(source)) {
    type = type.replaceAll(imported.module + ".", imported.alias + ".");
  }
  return `${request.token} : ${type}`;
}
self.onmessage = async (event) => {
  const request = event.data;
  if (request.kind === "type") {
    try {
      const type = await typeOf(request);
      self.postMessage({ kind: "type", id: request.id, type });
    } catch {
      self.postMessage({ kind: "type", id: request.id });
    }
    return;
  }
  try {
    const output = await run(request.entry, request.files);
    self.postMessage({ kind: "run", id: request.id, ok: true, output });
  } catch (error) {
    self.postMessage({ kind: "run", id: request.id, ok: false, output: showError(error) });
  }
};

//# debugId=747AD848305B57B864756E2164756E21
//# sourceMappingURL=bendWorker.js.map
