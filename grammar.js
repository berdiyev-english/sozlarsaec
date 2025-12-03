class GrammarManager {
  constructor(appInstance) {
    this.app = appInstance;
    this.currentLevel = null;
    
    // База данных грамматики (A1 - C2)
    this.data = {
      
      "A1": [
  // --- PRESENT TENSES ---
  {
    id: 'a1_to_be',
    title: "Глагол 'to be' (am/is/are)",
    desc: "Быть, являться, находиться.",
    icon: 'fa-bolt',
    content: `
      <h3>Что это такое?</h3>
      <p>В русском мы говорим: "Я студент", "Он дома". А в английском <strong>ВСЕГДА</strong> должен быть глагол. Поэтому вставляем <strong>am/is/are</strong> (это формы глагола "быть").</p>
      
      <h3>Какую форму выбрать?</h3>
      <div class="grammar-example-box">
        <strong>I (я)</strong> → am<br>
        <strong>He/She/It (он/она/оно)</strong> → is<br>
        <strong>You/We/They (ты, вы/мы/они)</strong> → are
      </div>
      
      <h3>Примеры (утверждение)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>am</strong> a student.</div>
        <div class="ru-ex">Я (есть) студент.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>is</strong> happy.</div>
        <div class="ru-ex">Она счастлива.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">We <strong>are</strong> at home.</div>
        <div class="ru-ex">Мы дома.</div>
      </div>

      <h3>Как сделать отрицание?</h3>
      <p>Добавляем <strong>not</strong> после am/is/are:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I am <strong>not</strong> tired. (I'm not)</div>
        <div class="ru-ex">Я не устал.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">He is <strong>not</strong> here. (He isn't)</div>
        <div class="ru-ex">Его здесь нет.</div>
      </div>

      <h3>Как задать вопрос?</h3>
      <p>Переставляем am/is/are в начало:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Are</strong> you ready?</div>
        <div class="ru-ex">Ты готов?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Is</strong> she a teacher?</div>
        <div class="ru-ex">Она учитель?</div>
      </div>
    `
  },
  {
    id: 'a1_present_simple',
    title: "Present Simple",
    desc: "Регулярные действия и факты.",
    icon: 'fa-clock',
    content: `
      <h3>Когда используем?</h3>
      <p>Когда говорим о том, что происходит <strong>регулярно, обычно, всегда</strong> (не прямо сейчас!):</p>
      <ul>
        <li>✅ Я хожу на работу каждый день</li>
        <li>✅ Он любит кофе</li>
        <li>✅ Земля круглая (факт)</li>
      </ul>
      
      <h3>Как построить предложение?</h3>
<div class="grammar-example-box">
        <strong>I/You/We/They</strong> + глагол <strong>БЕЗ ИЗМЕНЕНИЙ</strong><br>
        <strong>He/She/It</strong> + глагол <strong>+ S</strong>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I <strong>work</strong> every day.</div>
        <div class="ru-ex">Я работаю каждый день.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>works</strong> every day.</div>
        <div class="ru-ex">Она работает каждый день.</div>
      </div>

      <h3>⚠️ Важно! Окончание -S только для He/She/It</h3>
      <p>Это самая частая ошибка новичков. Запомните:</p>
      <ul>
        <li>I like ✅ (а не "I likes")</li>
        <li>He like<strong>s</strong> ✅</li>
      </ul>

      <h3>Отрицание</h3>
      <p>Добавляем помощника <strong>don't</strong> (do not) или <strong>doesn't</strong> (does not):</p>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>don't</strong> like fish.</div>
        <div class="ru-ex">Я не люблю рыбу.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>doesn't</strong> work on Sunday.</div>
        <div class="ru-ex">Она не работает в воскресенье.</div>
      </div>
      <p>⚠️ После doesn't глагол БЕЗ -S! (She doesn't work, а не "doesn't works")</p>

      <h3>Вопрос</h3>
      <p>Ставим <strong>Do</strong> или <strong>Does</strong> в начало:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Do</strong> you speak English?</div>
        <div class="ru-ex">Ты говоришь по-английски?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Does</strong> he live here?</div>
        <div class="ru-ex">Он здесь живет?</div>
      </div>
    `
  },
  {
    id: 'a1_present_continuous',
    title: "Present Continuous",
    desc: "Действие прямо сейчас.",
    icon: 'fa-running',
    content: `
      <h3>Когда используем?</h3>
      <p>Когда действие происходит <strong>ПРЯМО СЕЙЧАС</strong>, в момент разговора:</p>
      <ul>
        <li>✅ Я сейчас ем (прямо в эту секунду)</li>
        <li>✅ Он сейчас спит</li>
        <li>✅ Идёт дождь (смотрю в окно)</li>
      </ul>

      <h3>Как построить?</h3>
      <div class="grammar-example-box">
        <strong>am/is/are + глагол с окончанием -ING</strong>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I <strong>am eating</strong> now.</div>
        <div class="ru-ex">Я ем (сейчас).</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>is sleeping</strong>.</div>
        <div class="ru-ex">Она спит (прямо сейчас).</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">They <strong>are watching</strong> TV.</div>
        <div class="ru-ex">Они смотрят телевизор (в данный момент).</div>
      </div>

      <h3>Как добавить -ING?</h3>
      <p>Обычно просто добавляем к глаголу:</p>
      <ul>
        <li>work → work<strong>ing</strong></li>
        <li>play → play<strong>ing</strong></li>
        <li>read → read<strong>ing</strong></li>
      </ul>

      <h3>Отрицание</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I am <strong>not</strong> working now.</div>
        <div class="ru-ex">Я сейчас не работаю.</div>
      </div>

      <h3>Вопрос</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Are</strong> you listening?</div>
        <div class="ru-ex">Ты слушаешь?</div>
      </div>

      <h3>🔑 Главное отличие от Present Simple</h3>
      <p><strong>Present Simple:</strong> Я работаю (вообще, каждый день) → I work<br>
      <strong>Present Continuous:</strong> Я работаю (прямо сейчас) → I am working</p>
    `
  },
  {
    id: 'a1_have_got',
    title: "Have got",
    desc: "Иметь, обладать.",
    icon: 'fa-hand-holding',
    content: `
      <h3>Что это значит?</h3>
      <p><strong>Have got</strong> = "иметь, у меня есть"</p>
      <p>Используем, когда говорим о том, что у нас есть (машина, дом, семья, телефон и т.д.)</p>

      <h3>Как использовать?</h3>
      <div class="grammar-example-box">
        <strong>I/You/We/They</strong> + have got<br>
        <strong>He/She/It</strong> + has got
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I <strong>have got</strong> a car.</div>
        <div class="ru-ex">У меня есть машина.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>has got</strong> a dog.</div>
        <div class="ru-ex">У неё есть собака.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">They <strong>have got</strong> two children.</div>
        <div class="ru-ex">У них есть двое детей.</div>
      </div>

      <h3>Короткие формы (так говорят чаще)</h3>
      <ul>
        <li>I have got = I'<strong>ve got</strong></li>
        <li>He has got = He'<strong>s got</strong></li>
        <li>She has got = She'<strong>s got</strong></li>
      </ul>

      <h3>Отрицание</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>haven't got</strong> a car.</div>
        <div class="ru-ex">У меня нет машины.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">He <strong>hasn't got</strong> a brother.</div>
        <div class="ru-ex">У него нет брата.</div>
      </div>

      <h3>Вопрос</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Have</strong> you <strong>got</strong> a pen?</div>
        <div class="ru-ex">У тебя есть ручка?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Has</strong> she <strong>got</strong> a phone?</div>
        <div class="ru-ex">У неё есть телефон?</div>
      </div>

      <h3>💡 Можно сказать просто "have/has"</h3>
      <p>В американском английском часто говорят без "got":</p>
      <ul>
        <li>I have a car. (то же самое)</li>
        <li>She has a dog. (то же самое)</li>
      </ul>
    `
  },

  // --- PAST TENSES ---
  {
    id: 'a1_was_were',
    title: "Past: Was / Were",
    desc: "Глагол to be в прошлом.",
    icon: 'fa-history',
    content: `
      <h3>Что это?</h3>
      <p>Это формы глагола "быть" в прошедшем времени. Вместо am/is/are говорим was/were.</p>

      <h3>Какую форму выбрать?</h3>
      <div class="grammar-example-box">
        <strong>I/He/She/It</strong> → was<br>
        <strong>You/We/They</strong> → were
      </div>

      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>was</strong> at home yesterday.</div>
        <div class="ru-ex">Я был дома вчера.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>was</strong> tired.</div>
        <div class="ru-ex">Она была уставшей.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">They <strong>were</strong> happy.</div>
        <div class="ru-ex">Они были счастливы.</div>
      </div>

      <h3>Отрицание</h3>
      <p>Добавляем <strong>not</strong>:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>wasn't</strong> at school. (was not)</div>
        <div class="ru-ex">Меня не было в школе.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">They <strong>weren't</strong> late. (were not)</div>
        <div class="ru-ex">Они не опоздали.</div>
      </div>

      <h3>Вопрос</h3>
      <p>Переставляем was/were в начало:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Was</strong> he at work?</div>
        <div class="ru-ex">Он был на работе?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Were</strong> you busy?</div>
        <div class="ru-ex">Ты был занят?</div>
      </div>

      <h3>Подсказки времени</h3>
      <p>Слова, которые подсказывают, что нужно использовать was/were:</p>
      <ul>
        <li>yesterday (вчера)</li>
        <li>last week/month/year (на прошлой неделе/в прошлом месяце/году)</li>
        <li>two days ago (два дня назад)</li>
      </ul>
    `
  },
  {
    id: 'a1_past_simple',
    title: "Past Simple (V2 / -ed)",
    desc: "Завершенные действия в прошлом.",
    icon: 'fa-calendar-check',
    content: `
      <h3>Когда используем?</h3>
      <p>Когда говорим о действии, которое <strong>произошло и закончилось в прошлом</strong>:</p>
      <ul>
        <li>✅ Я купил телефон вчера</li>
        <li>✅ Она жила в Москве (раньше, но не сейчас)</li>
        <li>✅ Мы ходили в кино на прошлой неделе</li>
      </ul>

      <h3>Как построить?</h3>
      <p>Нужно изменить глагол на прошедшее время. Есть 2 типа глаголов:</p>

      <h3>1️⃣ Правильные глаголы</h3>
      <p>Просто добавляем окончание <strong>-ED</strong>:</p>
      <div class="grammar-example-box">
        work → work<strong>ed</strong><br>
        play → play<strong>ed</strong><br>
        watch → watch<strong>ed</strong><br>
        cook → cook<strong>ed</strong>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I <strong>worked</strong> yesterday.</div>
        <div class="ru-ex">Я работал вчера.</div>
      </div>

      <h3>2️⃣ Неправильные глаголы</h3>
      <p>Они меняются полностью (их нужно запоминать):</p>
      <div class="grammar-example-box">
        go → <strong>went</strong> (ходить → ходил)<br>
        buy → <strong>bought</strong> (покупать → купил)<br>
        eat → <strong>ate</strong> (есть → ел)<br>
        see → <strong>saw</strong> (видеть → видел)<br>
        come → <strong>came</strong> (приходить → пришел)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I <strong>went</strong> to the shop.</div>
        <div class="ru-ex">Я ходил в магазин.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>bought</strong> a new dress.</div>
        <div class="ru-ex">Она купила новое платье.</div>
      </div>

      <h3>Отрицание</h3>
      <p>Используем помощника <strong>didn't</strong> (did not), а глагол возвращаем в начальную форму:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>didn't work</strong> yesterday.</div>
        <div class="ru-ex">Я не работал вчера.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>didn't go</strong> to school.</div>
        <div class="ru-ex">Она не ходила в школу.</div>
      </div>
      <p>⚠️ НЕ "didn't went" - это ошибка! Только "didn't go"</p>

      <h3>Вопрос</h3>
      <p>Ставим <strong>Did</strong> в начало, глагол в начальную форму:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Did</strong> you <strong>work</strong> yesterday?</div>
        <div class="ru-ex">Ты работал вчера?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Did</strong> she <strong>go</strong> to the party?</div>
        <div class="ru-ex">Она ходила на вечеринку?</div>
      </div>

      <h3>Подсказки времени</h3>
      <ul>
        <li>yesterday (вчера)</li>
        <li>last week/month/year (на прошлой неделе/месяце/году)</li>
        <li>ago (назад: 2 days ago - 2 дня назад)</li>
        <li>in 2020 (в 2020 году)</li>
      </ul>
    `
  },

  // --- FUTURE ---
  {
    id: 'a1_future',
    title: "Future: Will vs Going to",
    desc: "Будущее время: решения и планы.",
    icon: 'fa-forward',
    content: `
      <h3>В английском 2 способа говорить о будущем</h3>

      <h3>1️⃣ WILL - спонтанное решение</h3>
      <p>Используем, когда <strong>решаем прямо сейчас</strong> (не планировали заранее):</p>
      
      <div class="grammar-example-box">
        <strong>I/You/He/She/We/They + will + глагол</strong>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">— The phone is ringing!<br>— I <strong>will</strong> answer it!</div>
        <div class="ru-ex">— Телефон звонит!<br>— Я отвечу! (решил прямо сейчас)</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>will</strong> help you.</div>
        <div class="ru-ex">Я помогу тебе. (решил в момент разговора)</div>
      </div>

      <p>💡 Короткая форма: I'll, He'll, She'll, We'll, They'll</p>

      <h3>2️⃣ BE GOING TO - запланированное действие</h3>
      <p>Используем, когда <strong>уже запланировали</strong> что-то заранее:</p>
      
      <div class="grammar-example-box">
        <strong>am/is/are + going to + глагол</strong>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I <strong>am going to</strong> sleep.</div>
        <div class="ru-ex">Я собираюсь спать. (уже решил)</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>is going to</strong> buy a car next month.</div>
        <div class="ru-ex">Она собирается купить машину в следующем месяце. (уже запланировала)</div>
      </div>

      <h3>🔑 Как выбрать?</h3>
      <p><strong>WILL:</strong> Решение прямо сейчас → "Помогу!" (только что решил)<br>
      <strong>GOING TO:</strong> Уже запланировал → "Я собираюсь..." (заранее решил)</p>

      <h3>Отрицание и вопрос</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>won't</strong> go. (will not)</div>
        <div class="ru-ex">Я не пойду.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Will</strong> you help me?</div>
        <div class="ru-ex">Ты поможешь мне?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I'm <strong>not going to</strong> work tomorrow.</div>
        <div class="ru-ex">Я не собираюсь работать завтра.</div>
      </div>
    `
  },

  // --- MODALS ---
  {
    id: 'a1_modals_basic',
    title: "Modals: Can, Would like",
    desc: "Способности и вежливые просьбы.",
    icon: 'fa-dumbbell',
    content: `
      <h3>CAN - "Могу, умею"</h3>
      <p>Используем, когда говорим о способности что-то делать:</p>

      <div class="grammar-example-box">
        <strong>I/You/He/She/We/They + CAN + глагол</strong><br>
        ⚠️ CAN никогда не меняется! (НЕ "cans", НЕ "to can")
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I <strong>can</strong> swim.</div>
        <div class="ru-ex">Я умею плавать.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>can</strong> speak English.</div>
        <div class="ru-ex">Она может говорить по-английски.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Can</strong> I help you?</div>
        <div class="ru-ex">Могу я помочь вам?</div>
      </div>

      <h3>Отрицание</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I <strong>can't</strong> drive. (cannot)</div>
        <div class="ru-ex">Я не умею водить.</div>
      </div>

      <h3>Вопрос</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Can</strong> you cook?</div>
        <div class="ru-ex">Ты умеешь готовить?</div>
      </div>

      <h3>WOULD LIKE - "Хотел бы"</h3>
      <p>Это вежливый способ сказать "Я хочу" (используем в магазинах, кафе, официальных ситуациях):</p>

      <div class="grammar-example-box">
        <strong>I/You/He/She/We/They + would like + существительное/to + глагол</strong>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I <strong>would like</strong> a coffee.</div>
        <div class="ru-ex">Я бы хотел кофе.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>would like to</strong> go home.</div>
        <div class="ru-ex">Она бы хотела пойти домой.</div>
      </div>

      <p>💡 Короткая форма: I'd like, He'd like</p>

      <h3>🔑 Разница</h3>
      <p><strong>I want</strong> - прямо, может звучать грубо<br>
      <strong>I would like</strong> - вежливо, культурно</p>
    `
  },
  {
    id: 'a1_imperative',
    title: "Imperative (Повелительное)",
    desc: "Приказы и просьбы.",
    icon: 'fa-exclamation',
    content: `
      <h3>Что это?</h3>
      <p>Когда мы просим или приказываем кому-то что-то сделать.</p>

      <h3>Как построить? (ДЕЛАЙ!)</h3>
      <p>Просто используем глагол БЕЗ "you" или других местоимений:</p>

      <div class="grammar-example-box">
        <strong>Глагол + остальное</strong>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>Open</strong> the door!</div>
        <div class="ru-ex">Открой дверь!</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Sit</strong> down, please.</div>
        <div class="ru-ex">Садись, пожалуйста.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Come</strong> here!</div>
        <div class="ru-ex">Иди сюда!</div>
      </div>

      <h3>Отрицание (НЕ ДЕЛАЙ!)</h3>
      <p>Добавляем <strong>Don't</strong> в начало:</p>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>Don't touch</strong> it!</div>
        <div class="ru-ex">Не трогай это!</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Don't be</strong> late!</div>
        <div class="ru-ex">Не опаздывай!</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Don't worry</strong>!</div>
        <div class="ru-ex">Не волнуйся!</div>
      </div>

      <h3>Вежливая просьба</h3>
      <p>Добавляем <strong>please</strong>:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Close the window, <strong>please</strong>.</div>
        <div class="ru-ex">Закрой окно, пожалуйста.</div>
      </div>

      <h3>Let's - "Давай!"</h3>
      <p>Когда предлагаем что-то сделать вместе:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Let's go</strong> to the cinema!</div>
        <div class="ru-ex">Давай пойдем в кино!</div>
      </div>
    `
  },

  // --- -ING AND INFINITIVE ---
  {
    id: 'a1_infinitive_gerund',
    title: "Verbs + to/-ing",
    desc: "Какие глаголы с чем использовать.",
    icon: 'fa-link',
    content: `
      <h3>Проблема</h3>
      <p>В русском мы говорим: "Я хочу <strong>спать</strong>", "Мне нравится <strong>плавать</strong>".</p>
      <p>В английском после некоторых глаголов нужно добавлять <strong>TO</strong> или <strong>-ING</strong>.</p>

      <h3>1️⃣ Глаголы + TO + глагол</h3>
      <p>После этих глаголов всегда ставим <strong>TO</strong>:</p>
      
      <div class="grammar-example-box">
        <strong>want</strong> (хотеть)<br>
        <strong>need</strong> (нуждаться)<br>
        <strong>would like</strong> (хотел бы)<br>
        <strong>plan</strong> (планировать)<br>
        <strong>decide</strong> (решать)<br>
        <strong>hope</strong> (надеяться)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I want <strong>to sleep</strong>.</div>
        <div class="ru-ex">Я хочу спать.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She needs <strong>to go</strong>.</div>
        <div class="ru-ex">Ей нужно идти.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I would like <strong>to see</strong> you.</div>
        <div class="ru-ex">Я хотел бы увидеть тебя.</div>
      </div>

      <h3>2️⃣ Глаголы + глагол-ING</h3>
      <p>После этих глаголов ставим глагол с окончанием <strong>-ING</strong>:</p>

      <div class="grammar-example-box">
        <strong>like</strong> (нравиться)<br>
        <strong>love</strong> (любить)<br>
        <strong>hate</strong> (ненавидеть)<br>
        <strong>enjoy</strong> (наслаждаться)<br>
        <strong>finish</strong> (заканчивать)<br>
        <strong>stop</strong> (прекращать)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I like <strong>swimming</strong>.</div>
        <div class="ru-ex">Мне нравится плавать.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She loves <strong>reading</strong> books.</div>
        <div class="ru-ex">Она любит читать книги.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I hate <strong>waiting</strong>.</div>
        <div class="ru-ex">Я ненавижу ждать.</div>
      </div>

      <h3>🔑 Как запомнить?</h3>
      <p>Пока просто запоминайте каждый глагол отдельно. Со временем это войдет в привычку!</p>

      <p>⚠️ Частые ошибки:</p>
      <ul>
        <li>❌ I want swimming</li>
        <li>✅ I want <strong>to swim</strong></li>
        <li>❌ I enjoy to read</li>
        <li>✅ I enjoy <strong>reading</strong></li>
      </ul>
    `
  },

  // --- NOUNS & ARTICLES ---
  {
    id: 'a1_articles',
    title: "Articles: A / An / The",
    desc: "Артикли в английском.",
    icon: 'fa-font',
    content: `
      <h3>Что такое артикли?</h3>
      <p>В русском мы говорим: "Я вижу собаку". В английском перед существительным почти всегда стоит маленькое слово (артикль).</p>

      <h3>A / AN - "Какой-то один" (неопределенный)</h3>
      <p>Используем, когда говорим о предмете <strong>ВПЕРВЫЕ</strong> или когда он <strong>НЕ КОНКРЕТНЫЙ</strong>:</p>

      <div class="grammar-example-box">
        <strong>A</strong> - перед согласной (a cat, a dog, a house)<br>
        <strong>AN</strong> - перед гласной (an apple, an egg, an orange)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I see <strong>a</strong> cat.</div>
        <div class="ru-ex">Я вижу (какого-то) кота. (первый раз упоминаем)</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I want <strong>an</strong> apple.</div>
        <div class="ru-ex">Я хочу (какое-то) яблоко. (любое, не важно какое)</div>
      </div>

      <h3>THE - "Этот конкретный" (определенный)</h3>
      <p>Используем, когда говорим о <strong>КОНКРЕТНОМ</strong> предмете или <strong>УЖЕ УПОМИНАЛИ</strong> его:</p>

      <div class="grammar-example-box">
        <div class="en-ex">I see a cat. <strong>The</strong> cat is black.</div>
        <div class="ru-ex">Я вижу кота. (Этот конкретный) кот черный.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">Close <strong>the</strong> door!</div>
        <div class="ru-ex">Закрой дверь! (конкретную, которая тут одна)</div>
      </div>

      <h3>🔑 Простое правило</h3>
      <p><strong>A/AN:</strong> Говорим в первый раз / не важно какой конкретно<br>
      <strong>THE:</strong> Уже говорили об этом / все понимают, о каком именно</p>

      <h3>Когда НЕ нужен артикль?</h3>
      <ul>
        <li>Множественное число вообще: I like cats (кошки вообще)</li>
        <li>Неисчисляемые вообще: I like milk (молоко вообще)</li>
        <li>Имена людей, городов: Moscow, John</li>
      </ul>

      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I need <strong>a</strong> pen.</div>
        <div class="ru-ex">Мне нужна (какая-нибудь) ручка.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">Where is <strong>the</strong> pen?</div>
        <div class="ru-ex">Где (та самая) ручка?</div>
      </div>
    `
  },
  {
    id: 'a1_plurals',
    title: "Plurals (Множественное)",
    desc: "Образование множественного числа.",
    icon: 'fa-users',
    content: `
      <h3>Что такое множественное число?</h3>
      <p>Когда предметов больше одного (две собаки, три книги).</p>

      <h3>Основное правило - добавляем -S</h3>
      <div class="grammar-example-box">
        cat → cat<strong>s</strong> (кот → коты)<br>
        book → book<strong>s</strong> (книга → книги)<br>
        phone → phone<strong>s</strong> (телефон → телефоны)
      </div>

      <h3>Особые случаи - добавляем -ES</h3>
      <p>Если слово заканчивается на -s, -ss, -ch, -sh, -x, -o:</p>
      <div class="grammar-example-box">
        bus → bus<strong>es</strong> (автобус → автобусы)<br>
        box → box<strong>es</strong> (коробка → коробки)<br>
        watch → watch<strong>es</strong> (часы → часы)<br>
        dish → dish<strong>es</strong> (блюдо → блюда)<br>
        potato → potato<strong>es</strong> (картошка → картошки)
      </div>

      <h3>Слова на -Y</h3>
      <p>Если перед Y согласная, меняем Y на IES:</p>
      <div class="grammar-example-box">
        baby → bab<strong>ies</strong> (малыш → малыши)<br>
        city → cit<strong>ies</strong> (город → города)<br>
        story → stor<strong>ies</strong> (история → истории)
      </div>

      <p>Если перед Y гласная, просто добавляем S:</p>
      <div class="grammar-example-box">
        boy → boys (мальчик → мальчики)<br>
        day → days (день → дни)
      </div>

      <h3>Неправильные формы (нужно запомнить!)</h3>
      <div class="grammar-example-box">
        man → <strong>men</strong> (мужчина → мужчины)<br>
        woman → <strong>women</strong> (женщина → женщины)<br>
        child → <strong>children</strong> (ребенок → дети)<br>
        person → <strong>people</strong> (человек → люди)<br>
        tooth → <strong>teeth</strong> (зуб → зубы)<br>
        foot → <strong>feet</strong> (нога → ноги)<br>
        mouse → <strong>mice</strong> (мышь → мыши)
      </div>

      <h3>Слова, которые НЕ меняются</h3>
      <div class="grammar-example-box">
        sheep → sheep (овца → овцы)<br>
        fish → fish (рыба → рыбы)
      </div>

      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I have two <strong>cats</strong>.</div>
        <div class="ru-ex">У меня два кота.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">There are many <strong>people</strong> here.</div>
        <div class="ru-ex">Здесь много людей.</div>
      </div>
    `
  },
  
  // --- PRONOUNS & DETERMINERS ---
  {
    id: 'a1_pronouns',
    title: "Pronouns (Местоимения)",
    desc: "I/Me/My - в чем разница?",
    icon: 'fa-user',
    content: `
      <h3>Проблема</h3>
      <p>В русском: "Я вижу его" и "Он видит меня".<br>
      В английском местоимения меняются в зависимости от роли в предложении.</p>

      <h3>1️⃣ Subject (Подлежащее) - КТО делает?</h3>
      <p>Это тот, кто выполняет действие:</p>
      <div class="grammar-example-box">
        <strong>I</strong> (я)<br>
        <strong>You</strong> (ты, вы)<br>
        <strong>He</strong> (он)<br>
        <strong>She</strong> (она)<br>
        <strong>It</strong> (оно)<br>
        <strong>We</strong> (мы)<br>
        <strong>They</strong> (они)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>I</strong> work here.</div>
        <div class="ru-ex">Я работаю здесь.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>She</strong> is a doctor.</div>
        <div class="ru-ex">Она врач.</div>
      </div>

      <h3>2️⃣ Object (Дополнение) - КОГО? КОМУ?</h3>
      <p>На кого направлено действие:</p>
      <div class="grammar-example-box">
        <strong>me</strong> (меня, мне)<br>
        <strong>you</strong> (тебя, вам)<br>
        <strong>him</strong> (его, ему)<br>
        <strong>her</strong> (её, ей)<br>
        <strong>it</strong> (его/её для вещей)<br>
        <strong>us</strong> (нас, нам)<br>
        <strong>them</strong> (их, им)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">He calls <strong>me</strong>.</div>
        <div class="ru-ex">Он звонит мне.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I love <strong>her</strong>.</div>
        <div class="ru-ex">Я люблю её.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">Tell <strong>them</strong> the truth.</div>
        <div class="ru-ex">Скажи им правду.</div>
      </div>

      <h3>3️⃣ Possessive (Притяжательные) - ЧЕЙ?</h3>
      <p>Показывает принадлежность (перед существительным):</p>
      <div class="grammar-example-box">
        <strong>my</strong> (мой)<br>
        <strong>your</strong> (твой, ваш)<br>
        <strong>his</strong> (его)<br>
        <strong>her</strong> (её)<br>
        <strong>its</strong> (его/её для вещей)<br>
        <strong>our</strong> (наш)<br>
        <strong>their</strong> (их)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">This is <strong>my</strong> car.</div>
        <div class="ru-ex">Это моя машина.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Her</strong> name is Anna.</div>
        <div class="ru-ex">Её имя - Анна.</div>
      </div>

      <h3>📊 Таблица для запоминания</h3>
      <div class="grammar-example-box">
        Кто? | Кого? | Чей?<br>
        I → me → my<br>
        You → you → your<br>
        He → him → his<br>
        She → her → her<br>
        We → us → our<br>
        They → them → their
      </div>

      <h3>Примеры использования</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>I</strong> give <strong>him</strong> <strong>my</strong> book.</div>
        <div class="ru-ex">Я даю ему мою книгу.</div>
      </div>
    `
  },
  {
    id: 'a1_whose_possessive',
    title: "Whose & Possessive 's",
    desc: "Чей? Принадлежность.",
    icon: 'fa-key',
    content: `
      <h3>WHOSE - "Чей?"</h3>
      <p>Вопросительное слово, когда хотим узнать, кому что принадлежит:</p>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>Whose</strong> bag is this?</div>
        <div class="ru-ex">Чья это сумка?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Whose</strong> phone is ringing?</div>
        <div class="ru-ex">Чей телефон звонит?</div>
      </div>

      <h3>Possessive 'S - показываем принадлежность</h3>
      <p>В русском: "машина Джона". В английском добавляем <strong>'S</strong> к владельцу:</p>

      <div class="grammar-example-box">
        <strong>Владелец + 'S + вещь</strong>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">It's <strong>John's</strong> car.</div>
        <div class="ru-ex">Это машина Джона.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">My <strong>mother's</strong> phone.</div>
        <div class="ru-ex">Телефон моей мамы.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Tom's</strong> brother.</div>
        <div class="ru-ex">Брат Тома.</div>
      </div>

      <h3>Множественное число</h3>
      <p>Если владельцев много и слово уже заканчивается на -S, ставим только <strong>'</strong>:</p>

      <div class="grammar-example-box">
        <div class="en-ex">My <strong>parents'</strong> house.</div>
        <div class="ru-ex">Дом моих родителей.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">The <strong>students'</strong> books.</div>
        <div class="ru-ex">Книги студентов.</div>
      </div>

      <p>Но если множественное число неправильное (без -S), добавляем 'S:</p>

      <div class="grammar-example-box">
        <div class="en-ex">The <strong>children's</strong> toys.</div>
        <div class="ru-ex">Игрушки детей.</div>
      </div>

      <h3>🔑 Важно!</h3>
      <p>Не путайте:</p>
      <ul>
        <li><strong>John's</strong> car (машина Джона) ✅</li>
        <li><strong>Johns</strong> car ❌</li>
      </ul>
    `
  },
  {
    id: 'a1_this_that',
    title: "This / That / These / Those",
    desc: "Указательные местоимения.",
    icon: 'fa-finger-print',
    content: `
      <h3>Что это?</h3>
      <p>Слова, которыми мы указываем на предметы (этот, тот).</p>

      <h3>Близко (рядом со мной) 👇</h3>
      <div class="grammar-example-box">
        <strong>THIS</strong> (этот, эта, это) - ОДИН предмет<br>
        <strong>THESE</strong> (эти) - МНОГО предметов
      </div>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>This</strong> book is interesting.</div>
        <div class="ru-ex">Эта книга (которая здесь) интересная.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>These</strong> apples are fresh.</div>
        <div class="ru-ex">Эти яблоки (которые здесь) свежие.</div>
      </div>

      <h3>Далеко (там) 👉</h3>
      <div class="grammar-example-box">
        <strong>THAT</strong> (тот, та, то) - ОДИН предмет<br>
        <strong>THOSE</strong> (те) - МНОГО предметов
      </div>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>That</strong> car is expensive.</div>
        <div class="ru-ex">Та машина (которая там) дорогая.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Those</strong> people are tourists.</div>
        <div class="ru-ex">Те люди (которые там) туристы.</div>
      </div>

      <h3>📊 Схема</h3>
      <div class="grammar-example-box">
        БЛИЗКО 👇 | ДАЛЕКО 👉<br>
        This (один) | That (один)<br>
        These (много) | Those (много)
      </div>

      <h3>В разговоре</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I like <strong>this</strong> phone. (держу в руках)</div>
        <div class="ru-ex">Мне нравится этот телефон.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">Look at <strong>those</strong> birds! (показываю далеко)</div>
        <div class="ru-ex">Посмотри на тех птиц!</div>
      </div>

      <h3>Вопросы</h3>
      <div class="grammar-example-box">
        <div class="en-ex">What is <strong>this</strong>?</div>
        <div class="ru-ex">Что это?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">Who are <strong>those</strong> people?</div>
        <div class="ru-ex">Кто те люди?</div>
      </div>
    `
  },
  {
    id: 'a1_quantifiers',
    title: "Some, Any, Much, Many",
    desc: "Количество: немного, много.",
    icon: 'fa-layer-group',
    content: `
      <h3>SOME и ANY - "Немного, какой-то"</h3>

      <h3>SOME - в утверждениях ✅</h3>
      <p>Используем, когда говорим, что что-то ЕСТЬ:</p>

      <div class="grammar-example-box">
        <div class="en-ex">I have <strong>some</strong> money.</div>
        <div class="ru-ex">У меня есть немного денег.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">There are <strong>some</strong> apples in the fridge.</div>
        <div class="ru-ex">В холодильнике есть (несколько) яблок.</div>
      </div>

      <h3>ANY - в вопросах ❓ и отрицаниях ❌</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Do you have <strong>any</strong> money?</div>
        <div class="ru-ex">У тебя есть (какие-нибудь) деньги?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I don't have <strong>any</strong> money.</div>
        <div class="ru-ex">У меня нет денег.</div>
      </div>

      <h3>MUCH и MANY - "Много"</h3>

      <h3>MANY - с тем, что можно посчитать (1, 2, 3...)</h3>
      <div class="grammar-example-box">
        <strong>Many + исчисляемые</strong><br>
        friends (друзья) ✅<br>
        books (книги) ✅<br>
        cars (машины) ✅
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I have <strong>many</strong> friends.</div>
        <div class="ru-ex">У меня много друзей.</div>
      </div>

      <h3>MUCH - с тем, что НЕльзя посчитать</h3>
      <div class="grammar-example-box">
        <strong>Much + неисчисляемые</strong><br>
        water (вода) ✅<br>
        money (деньги) ✅<br>
        time (время) ✅<br>
        milk (молоко) ✅
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I don't have <strong>much</strong> time.</div>
        <div class="ru-ex">У меня мало времени.</div>
      </div>

      <h3>A LOT OF - универсальное "много" 🎯</h3>
      <p>Работает ВЕЗДЕ (с любыми существительными):</p>

      <div class="grammar-example-box">
        <div class="en-ex">I have <strong>a lot of</strong> friends.</div>
        <div class="ru-ex">У меня много друзей.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I have <strong>a lot of</strong> time.</div>
        <div class="ru-ex">У меня много времени.</div>
      </div>

      <h3>A FEW и A LITTLE - "Немного"</h3>
      <div class="grammar-example-box">
        <strong>A FEW</strong> + исчисляемые (a few apples)<br>
        <strong>A LITTLE</strong> + неисчисляемые (a little water)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I have <strong>a few</strong> questions.</div>
        <div class="ru-ex">У меня есть несколько вопросов.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">Add <strong>a little</strong> salt.</div>
        <div class="ru-ex">Добавь немного соли.</div>
      </div>

      <h3>🔑 Как запомнить?</h3>
      <p><strong>Можно посчитать?</strong> → MANY / A FEW<br>
      <strong>Нельзя посчитать?</strong> → MUCH / A LITTLE<br>
      <strong>Не уверен?</strong> → A LOT OF (всегда работает!)</p>
    `
  },

  // --- THERE & IT ---
  {
    id: 'a1_there_is',
    title: "There is / There are",
    desc: "Описание места: что где находится.",
    icon: 'fa-map-marker-alt',
    content: `
      <h3>Что это?</h3>
      <p>Конструкция для описания того, что где-то <strong>находится</strong> или <strong>существует</strong>.</p>
      <p>В русском: "В комнате есть стол", "Там есть кот".</p>

      <h3>Как использовать?</h3>
      <div class="grammar-example-box">
        <strong>There IS</strong> + ОДИН предмет (единственное число)<br>
        <strong>There ARE</strong> + МНОГО предметов (множественное число)
      </div>

      <h3>Примеры с There IS (один)</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>There is</strong> a cat in the box.</div>
        <div class="ru-ex">В коробке (есть) кот.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>There is</strong> a book on the table.</div>
        <div class="ru-ex">На столе (лежит) книга.</div>
      </div>

      <h3>Примеры с There ARE (много)</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>There are</strong> two cats in the box.</div>
        <div class="ru-ex">В коробке (есть) два кота.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>There are</strong> many people here.</div>
        <div class="ru-ex">Здесь (есть) много людей.</div>
      </div>

      <h3>Отрицание</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>There isn't</strong> a TV in my room.</div>
        <div class="ru-ex">В моей комнате нет телевизора.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>There aren't</strong> any chairs.</div>
        <div class="ru-ex">Здесь нет стульев.</div>
      </div>

      <h3>Вопрос</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Is there</strong> a bank near here?</div>
        <div class="ru-ex">Здесь есть банк поблизости?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Are there</strong> any questions?</div>
        <div class="ru-ex">Есть вопросы?</div>
      </div>

      <h3>⚠️ Не путайте с IT IS!</h3>
      <div class="grammar-example-box">
        <strong>There is/are</strong> - говорим, что что-то существует/находится где-то<br>
        <strong>It is</strong> - описываем конкретный предмет
      </div>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>There is</strong> a cat. (Там есть кот)</div>
        <div class="en-ex"><strong>It is</strong> black. (Он черный)</div>
      </div>
    `
  },

  // --- ADJECTIVES & ADVERBS ---
  {
    id: 'a1_adjectives_basic',
    title: "Basic Adjectives",
    desc: "Прилагательные: описываем предметы.",
    icon: 'fa-palette',
    content: `
      <h3>Что такое прилагательные?</h3>
      <p>Слова, которые описывают <strong>какой</strong> предмет:</p>
      <ul>
        <li>большой дом</li>
        <li>красивая девушка</li>
        <li>вкусная еда</li>
      </ul>

      <h3>Где ставить прилагательное?</h3>
      
      <h3>1️⃣ Перед существительным</h3>
      <div class="grammar-example-box">
        <div class="en-ex">A <strong>big</strong> house.</div>
        <div class="ru-ex">Большой дом.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">A <strong>beautiful</strong> girl.</div>
        <div class="ru-ex">Красивая девушка.</div>
      </div>

      <h3>2️⃣ После глагола BE (am/is/are)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The house is <strong>big</strong>.</div>
        <div class="ru-ex">Дом большой.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She is <strong>beautiful</strong>.</div>
        <div class="ru-ex">Она красивая.</div>
      </div>

      <h3>⚠️ Важно! Прилагательные НЕ меняются!</h3>
      <p>В русском: красивая девушка → красивые девушки (меняется)<br>
      В английском прилагательное ВСЕГДА одинаковое:</p>

      <div class="grammar-example-box">
        <div class="en-ex">A beautiful girl → Beautiful girls</div>
        <div class="ru-ex">Красивая девушка → Красивые девушки</div>
      </div>

      <h3>Популярные прилагательные для начинающих</h3>
      <div class="grammar-example-box">
        <strong>Размер:</strong> big/small (большой/маленький), long/short (длинный/короткий)<br>
        <strong>Возраст:</strong> old/new/young (старый/новый/молодой)<br>
        <strong>Качество:</strong> good/bad (хороший/плохой)<br>
        <strong>Температура:</strong> hot/cold/warm (горячий/холодный/теплый)<br>
        <strong>Цена:</strong> expensive/cheap (дорогой/дешевый)<br>
        <strong>Эмоции:</strong> happy/sad (счастливый/грустный)<br>
        <strong>Оценка:</strong> interesting/boring (интересный/скучный)<br>
        <strong>Сложность:</strong> easy/difficult (легкий/трудный)
      </div>

      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">This is an <strong>expensive</strong> car.</div>
        <div class="ru-ex">Это дорогая машина.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">The film is <strong>interesting</strong>.</div>
        <div class="ru-ex">Фильм интересный.</div>
      </div>
    `
  },
  {
    id: 'a1_adverbs_manner',
    title: "Adverbs of Manner",
    desc: "Наречия: как что-то делается.",
    icon: 'fa-running',
    content: `
      <h3>Что такое наречия?</h3>
      <p>Слова, которые описывают <strong>КАК</strong> выполняется действие:</p>
      <ul>
        <li>Он говорит <strong>медленно</strong></li>
        <li>Она поет <strong>красиво</strong></li>
        <li>Я работаю <strong>быстро</strong></li>
      </ul>

      <h3>🔑 Разница с прилагательными</h3>
      <div class="grammar-example-box">
        <strong>Прилагательное</strong> описывает ПРЕДМЕТ (какой?)<br>
        <strong>Наречие</strong> описывает ДЕЙСТВИЕ (как?)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">She is a <strong>slow</strong> driver. (прилагательное)</div>
        <div class="ru-ex">Она медленный водитель.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She drives <strong>slowly</strong>. (наречие)</div>
        <div class="ru-ex">Она водит медленно.</div>
      </div>

      <h3>Как образовать наречие?</h3>
      <p>Обычно: <strong>прилагательное + -LY</strong></p>

      <div class="grammar-example-box">
        slow → slow<strong>ly</strong> (медленно)<br>
        quick → quick<strong>ly</strong> (быстро)<br>
        careful → careful<strong>ly</strong> (осторожно)<br>
        beautiful → beautiful<strong>ly</strong> (красиво)<br>
        quiet → quiet<strong>ly</strong> (тихо)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">He speaks <strong>slowly</strong>.</div>
        <div class="ru-ex">Он говорит медленно.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She works <strong>carefully</strong>.</div>
        <div class="ru-ex">Она работает осторожно.</div>
      </div>

      <h3>⚠️ Исключения (не добавляют -LY)</h3>
      <div class="grammar-example-box">
        <strong>good</strong> (хороший) → <strong>well</strong> (хорошо)<br>
        <strong>fast</strong> (быстрый) → <strong>fast</strong> (быстро) - не меняется!<br>
        <strong>hard</strong> (усердный) → <strong>hard</strong> (усердно) - не меняется!
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">She sings <strong>well</strong>. ✅</div>
        <div class="ru-ex">Она хорошо поет.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She sings <strong>goodly</strong>. ❌</div>
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">He runs <strong>fast</strong>.</div>
        <div class="ru-ex">Он бегает быстро.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I work <strong>hard</strong>.</div>
        <div class="ru-ex">Я работаю усердно.</div>
      </div>
    `
  },
  {
    id: 'a1_comparative',
    title: "Comparatives",
    desc: "Сравнение: лучше, быстрее, красивее.",
    icon: 'fa-balance-scale-right',
    content: `
      <h3>Что это?</h3>
      <p>Когда сравниваем два предмета (один лучше/хуже/больше другого):</p>
      <ul>
        <li>Этот дом <strong>больше</strong>, чем тот</li>
        <li>Она <strong>быстрее</strong> меня</li>
      </ul>

      <h3>Как построить сравнение?</h3>

      <h3>1️⃣ Короткие слова (1 слог) + -ER</h3>
      <div class="grammar-example-box">
        fast → fast<strong>er</strong> (быстрее)<br>
        old → old<strong>er</strong> (старше)<br>
        tall → tall<strong>er</strong> (выше)<br>
        small → small<strong>er</strong> (меньше)<br>
        cheap → cheap<strong>er</strong> (дешевле)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">This car is <strong>faster</strong> than that one.</div>
        <div class="ru-ex">Эта машина быстрее, чем та.</div>
      </div>

      <h3>2️⃣ Длинные слова (2+ слогов) → MORE + слово</h3>
      <div class="grammar-example-box">
        expensive → <strong>more</strong> expensive (более дорогой)<br>
        interesting → <strong>more</strong> interesting (более интересный)<br>
        beautiful → <strong>more</strong> beautiful (более красивый)<br>
        difficult → <strong>more</strong> difficult (более трудный)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">This book is <strong>more interesting</strong> than that one.</div>
        <div class="ru-ex">Эта книга интереснее, чем та.</div>
      </div>

      <h3>⚠️ Исключения (неправильные формы)</h3>
      <div class="grammar-example-box">
        good (хороший) → <strong>better</strong> (лучше)<br>
        bad (плохой) → <strong>worse</strong> (хуже)<br>
        far (далеко) → <strong>farther/further</strong> (дальше)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">This coffee is <strong>better</strong> than that one.</div>
        <div class="ru-ex">Этот кофе лучше, чем тот.</div>
      </div>

      <h3>Слово THAN - "чем"</h3>
      <p>Используем, когда сравниваем с чем-то:</p>

      <div class="grammar-example-box">
        <div class="en-ex">I'm taller <strong>than</strong> you.</div>
        <div class="ru-ex">Я выше, чем ты.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She is more beautiful <strong>than</strong> her sister.</div>
        <div class="ru-ex">Она красивее, чем её сестра.</div>
      </div>

      <h3>🔑 Как понять, -ER или MORE?</h3>
      <p><strong>Короткое слово (1-2 слога)?</strong> → добавляем -ER<br>
      <strong>Длинное слово (3+ слога)?</strong> → ставим MORE</p>
    `
  },
  {
    id: 'a1_superlative',
    title: "Superlatives",
    desc: "Самый лучший, самый быстрый.",
    icon: 'fa-trophy',
    content: `
      <h3>Что это?</h3>
      <p>Когда говорим о <strong>САМОМ</strong> чем-то (из всех):</p>
      <ul>
        <li>Он <strong>самый высокий</strong> в классе</li>
        <li>Это <strong>самая дорогая</strong> машина</li>
      </ul>

      <h3>Как построить?</h3>

      <h3>1️⃣ Короткие слова → THE + -EST</h3>
      <div class="grammar-example-box">
        fast → <strong>the fastest</strong> (самый быстрый)<br>
        old → <strong>the oldest</strong> (самый старый)<br>
        tall → <strong>the tallest</strong> (самый высокий)<br>
        big → <strong>the biggest</strong> (самый большой)<br>
        cheap → <strong>the cheapest</strong> (самый дешевый)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">He is <strong>the tallest</strong> guy here.</div>
        <div class="ru-ex">Он самый высокий парень здесь.</div>
      </div>

      <h3>2️⃣ Длинные слова → THE MOST + слово</h3>
      <div class="grammar-example-box">
        expensive → <strong>the most expensive</strong> (самый дорогой)<br>
        interesting → <strong>the most interesting</strong> (самый интересный)<br>
        beautiful → <strong>the most beautiful</strong> (самый красивый)<br>
        difficult → <strong>the most difficult</strong> (самый трудный)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">This is <strong>the most expensive</strong> car.</div>
        <div class="ru-ex">Это самая дорогая машина.</div>
      </div>

      <h3>⚠️ Исключения</h3>
      <div class="grammar-example-box">
        good (хороший) → <strong>the best</strong> (самый лучший)<br>
        bad (плохой) → <strong>the worst</strong> (самый худший)<br>
        far (далеко) → <strong>the farthest/furthest</strong> (самый дальний)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">This is <strong>the best</strong> day of my life!</div>
        <div class="ru-ex">Это лучший день в моей жизни!</div>
      </div>

      <h3>⚠️ Не забывайте THE!</h3>
      <p>В превосходной степени ВСЕГДА ставим THE:</p>
      <ul>
        <li>✅ the biggest</li>
        <li>❌ biggest</li>
      </ul>

      <h3>📊 Таблица сравнения</h3>
      <div class="grammar-example-box">
        Обычный | Сравнительная | Превосходная<br>
        big | bigger | the biggest<br>
        expensive | more expensive | the most expensive<br>
        good | better | the best
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">She is <strong>the most beautiful</strong> girl in the class.</div>
        <div class="ru-ex">Она самая красивая девушка в классе.</div>
      </div>
    `
  },

  // --- CONJUNCTIONS ---
  {
    id: 'a1_conjunctions',
    title: "Basic Conjunctions",
    desc: "Союзы: соединяем слова и предложения.",
    icon: 'fa-link',
    content: `
      <h3>Что такое союзы?</h3>
      <p>Слова-связки, которые соединяют части предложения.</p>

      <h3>AND - "И" (добавление)</h3>
      <p>Используем, чтобы добавить информацию:</p>

      <div class="grammar-example-box">
        <div class="en-ex">I like tea <strong>and</strong> coffee.</div>
        <div class="ru-ex">Мне нравится чай и кофе.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She is smart <strong>and</strong> beautiful.</div>
        <div class="ru-ex">Она умная и красивая.</div>
      </div>

      <h3>BUT - "Но" (противопоставление)</h3>
      <p>Показываем контраст, неожиданность:</p>

      <div class="grammar-example-box">
        <div class="en-ex">It's expensive <strong>but</strong> good.</div>
        <div class="ru-ex">Это дорого, но хорошо.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I want to go, <strong>but</strong> I'm busy.</div>
        <div class="ru-ex">Я хочу пойти, но я занят.</div>
      </div>

      <h3>OR - "Или" (выбор)</h3>
      <p>Предлагаем варианты на выбор:</p>

      <div class="grammar-example-box">
        <div class="en-ex">Tea <strong>or</strong> coffee?</div>
        <div class="ru-ex">Чай или кофе?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">Do you want to go <strong>or</strong> stay?</div>
        <div class="ru-ex">Ты хочешь пойти или остаться?</div>
      </div>

      <h3>SO - "Поэтому" (результат)</h3>
      <p>Показываем результат, следствие:</p>

      <div class="grammar-example-box">
        <div class="en-ex">I'm tired, <strong>so</strong> I'm going home.</div>
        <div class="ru-ex">Я устал, поэтому иду домой.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">It's raining, <strong>so</strong> take an umbrella.</div>
        <div class="ru-ex">Идет дождь, поэтому возьми зонт.</div>
      </div>

      <h3>BECAUSE - "Потому что" (причина)</h3>
      <p>Объясняем причину:</p>

      <div class="grammar-example-box">
        <div class="en-ex">I'm happy <strong>because</strong> it's Friday.</div>
        <div class="ru-ex">Я счастлив, потому что сегодня пятница.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She stayed home <strong>because</strong> she was sick.</div>
        <div class="ru-ex">Она осталась дома, потому что была больна.</div>
      </div>

      <h3>🔑 Разница SO и BECAUSE</h3>
      <div class="grammar-example-box">
        <strong>BECAUSE</strong> - объясняем ПОЧЕМУ<br>
        <strong>SO</strong> - показываем ЧТО ПОТОМ
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I'm tired <strong>because</strong> I worked hard.</div>
        <div class="ru-ex">Я устал, потому что много работал. (причина)</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I worked hard, <strong>so</strong> I'm tired.</div>
        <div class="ru-ex">Я много работал, поэтому устал. (результат)</div>
      </div>
    `
  },

  // --- PREPOSITIONS ---
  {
    id: 'a1_prepositions_time',
    title: "Prepositions of Time",
    desc: "Предлоги времени: когда?",
    icon: 'fa-clock',
    content: `
      <h3>Что это?</h3>
      <p>Маленькие слова, которые показывают КОГДА что-то происходит.</p>

      <h3>AT - точное время, момент ⏰</h3>
      <p>Используем для конкретного времени на часах:</p>

      <div class="grammar-example-box">
        <strong>at</strong> 5 o'clock (в 5 часов)<br>
        <strong>at</strong> 7:30 (в 7:30)<br>
        <strong>at</strong> midnight (в полночь)<br>
        <strong>at</strong> noon (в полдень)<br>
        <strong>at</strong> the weekend (на выходных - British English)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I wake up <strong>at</strong> 7 o'clock.</div>
        <div class="ru-ex">Я просыпаюсь в 7 часов.</div>
      </div>

      <h3>ON - дни 📅</h3>
      <p>Используем для дней недели и дат:</p>

      <div class="grammar-example-box">
        <strong>on</strong> Monday (в понедельник)<br>
        <strong>on</strong> weekends (по выходным - American English)<br>
        <strong>on</strong> 15th May (15 мая)<br>
        <strong>on</strong> New Year's Day (в Новый год)<br>
        <strong>on</strong> my birthday (в мой день рождения)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I don't work <strong>on</strong> Sunday.</div>
        <div class="ru-ex">Я не работаю в воскресенье.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">The party is <strong>on</strong> Saturday.</div>
        <div class="ru-ex">Вечеринка в субботу.</div>
      </div>

      <h3>IN - длинные периоды 📆</h3>
      <p>Используем для месяцев, лет, времен года, частей дня:</p>

      <div class="grammar-example-box">
        <strong>in</strong> January (в январе)<br>
        <strong>in</strong> 2024 (в 2024 году)<br>
        <strong>in</strong> summer (летом)<br>
        <strong>in</strong> the morning (утром)<br>
        <strong>in</strong> the afternoon (днем)<br>
        <strong>in</strong> the evening (вечером)
      </div>

      <p>⚠️ Исключение: <strong>at</strong> night (ночью)</p>

      <div class="grammar-example-box">
        <div class="en-ex">I was born <strong>in</strong> 1995.</div>
        <div class="ru-ex">Я родился в 1995 году.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">It's cold <strong>in</strong> winter.</div>
        <div class="ru-ex">Зимой холодно.</div>
      </div>

      <h3>🔑 Легкий способ запомнить</h3>
      <div class="grammar-example-box">
        <strong>AT</strong> - конкретная точка во времени (как точка на часах)<br>
        <strong>ON</strong> - конкретный день (как день в календаре)<br>
        <strong>IN</strong> - большой период времени (месяц, год, сезон)
      </div>
    `
  },
  {
    id: 'a1_prepositions_place',
    title: "Prepositions of Place",
    desc: "Предлоги места: где?",
    icon: 'fa-map-pin',
    content: `
      <h3>Что это?</h3>
      <p>Маленькие слова, которые показывают ГДЕ что-то находится.</p>

      <h3>AT - точка на карте 📍</h3>
      <p>Используем для конкретного места как точки:</p>

      <div class="grammar-example-box">
        <strong>at</strong> home (дома)<br>
        <strong>at</strong> work (на работе)<br>
        <strong>at</strong> school (в школе)<br>
        <strong>at</strong> the bus stop (на остановке)<br>
        <strong>at</strong> the door (у двери)<br>
        <strong>at</strong> the airport (в аэропорту)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I'm <strong>at</strong> home now.</div>
        <div class="ru-ex">Я сейчас дома.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She is <strong>at</strong> work.</div>
        <div class="ru-ex">Она на работе.</div>
      </div>

      <h3>ON - на поверхности 📋</h3>
      <p>Когда что-то лежит/стоит НА чем-то:</p>

      <div class="grammar-example-box">
        <strong>on</strong> the table (на столе)<br>
        <strong>on</strong> the wall (на стене)<br>
        <strong>on</strong> the floor (на полу)<br>
        <strong>on</strong> the page (на странице)<br>
        <strong>on</strong> the left/right (слева/справа)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">The book is <strong>on</strong> the table.</div>
        <div class="ru-ex">Книга на столе.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">There's a picture <strong>on</strong> the wall.</div>
        <div class="ru-ex">На стене висит картина.</div>
      </div>

      <h3>IN - внутри 📦</h3>
      <p>Когда что-то находится ВНУТРИ чего-то:</p>

      <div class="grammar-example-box">
        <strong>in</strong> the room (в комнате)<br>
        <strong>in</strong> the box (в коробке)<br>
        <strong>in</strong> the car (в машине)<br>
        <strong>in</strong> London (в Лондоне)<br>
        <strong>in</strong> my pocket (в моем кармане)<br>
        <strong>in</strong> the book (в книге)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex">I live <strong>in</strong> Moscow.</div>
        <div class="ru-ex">Я живу в Москве.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">The cat is <strong>in</strong> the box.</div>
        <div class="ru-ex">Кот в коробке.</div>
      </div>

      <h3>🔑 Легкий способ запомнить</h3>
      <div class="grammar-example-box">
        <strong>AT</strong> - точка (как булавка на карте)<br>
        <strong>ON</strong> - на поверхности (что-то касается)<br>
        <strong>IN</strong> - внутри (окружено со всех сторон)
      </div>

      <h3>⚠️ Важные исключения с транспортом</h3>
      <ul>
        <li><strong>in</strong> a car (в машине)</li>
        <li><strong>on</strong> a bus/train/plane (в автобусе/поезде/самолете)</li>
        <li><strong>on</strong> a bike (на велосипеде)</li>
      </ul>
    `
  },
  {
    id: 'a1_prepositions_position',
    title: "Position Prepositions",
    desc: "Предлоги положения: рядом, под, над.",
    icon: 'fa-arrows-alt',
    content: `
      <h3>Что это?</h3>
      <p>Предлоги, которые показывают расположение предметов относительно друг друга.</p>

      <h3>NEXT TO - "рядом с" 👥</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She sits <strong>next to</strong> me.</div>
        <div class="ru-ex">Она сидит рядом со мной.</div>
      </div>

      <h3>BETWEEN - "между" (два предмета) ↔️</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The bank is <strong>between</strong> the shop and the cafe.</div>
        <div class="ru-ex">Банк между магазином и кафе.</div>
      </div>

      <h3>BEHIND - "позади, за" 👤</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The cat is <strong>behind</strong> the sofa.</div>
        <div class="ru-ex">Кот за диваном.</div>
      </div>

      <h3>IN FRONT OF - "перед" 👁️</h3>
      <div class="grammar-example-box">
        <div class="en-ex">There's a car <strong>in front of</strong> the house.</div>
        <div class="ru-ex">Перед домом стоит машина.</div>
      </div>

      <h3>UNDER - "под" ⬇️</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The cat is <strong>under</strong> the table.</div>
        <div class="ru-ex">Кот под столом.</div>
      </div>

      <h3>OVER / ABOVE - "над" ⬆️</h3>
      <div class="grammar-example-box">
        <div class="en-ex">There's a lamp <strong>above</strong> the table.</div>
        <div class="ru-ex">Над столом висит лампа.</div>
      </div>

      <h3>OPPOSITE - "напротив" ↔️</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The bank is <strong>opposite</strong> the post office.</div>
        <div class="ru-ex">Банк напротив почты.</div>
      </div>

      <h3>NEAR - "около, рядом с" 📍</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I live <strong>near</strong> the park.</div>
        <div class="ru-ex">Я живу рядом с парком.</div>
      </div>

      <h3>📊 Визуальная схема</h3>
      <div class="grammar-example-box">
        above/over ⬆️<br>
        in front of 👉 [ПРЕДМЕТ] 👈 behind<br>
        under ⬇️<br><br>
        next to / near (рядом)<br>
        opposite (напротив)<br>
        between (между двумя)
      </div>

      <h3>Примеры в описании комнаты</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The TV is <strong>on</strong> the wall <strong>above</strong> the table.</div>
        <div class="ru-ex">Телевизор на стене над столом.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">The sofa is <strong>in front of</strong> the window.</div>
        <div class="ru-ex">Диван перед окном.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">My bag is <strong>under</strong> the chair.</div>
        <div class="ru-ex">Моя сумка под стулом.</div>
      </div>
    `
  },

  // --- QUESTIONS ---
  {
    id: 'a1_question_words',
    title: "Question Words",
    desc: "Вопросительные слова: что, где, когда.",
    icon: 'fa-question-circle',
    content: `
      <h3>Что такое вопросительные слова?</h3>
      <p>Специальные слова для получения информации (не просто да/нет).</p>

      <h3>WHAT? - "Что? Какой?" 🤔</h3>
      <p>Спрашиваем о предмете, действии или информации:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>What</strong> is your name?</div>
        <div class="ru-ex">Как тебя зовут? (Что твое имя?)</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>What</strong> are you doing?</div>
        <div class="ru-ex">Что ты делаешь?</div>
      </div>

      <h3>WHO? - "Кто?" 👤</h3>
      <p>Спрашиваем о человеке:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Who</strong> is that man?</div>
        <div class="ru-ex">Кто этот мужчина?</div>
      </div>

      <h3>WHERE? - "Где? Куда?" 📍</h3>
      <p>Спрашиваем о месте:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Where</strong> do you live?</div>
        <div class="ru-ex">Где ты живешь?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Where</strong> is the bank?</div>
        <div class="ru-ex">Где находится банк?</div>
      </div>

      <h3>WHEN? - "Когда?" ⏰</h3>
      <p>Спрашиваем о времени:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>When</strong> is your birthday?</div>
        <div class="ru-ex">Когда твой день рождения?</div>
      </div>

      <h3>WHY? - "Почему?" ❓</h3>
      <p>Спрашиваем о причине:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Why</strong> are you sad?</div>
        <div class="ru-ex">Почему ты грустный?</div>
      </div>
      <p>💡 Ответ обычно с <strong>because</strong>: Because I'm tired.</p>

      <h3>HOW? - "Как?" 🔧</h3>
      <p>Спрашиваем о способе или состоянии:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>How</strong> are you?</div>
        <div class="ru-ex">Как дела?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>How</strong> do you go to work?</div>
        <div class="ru-ex">Как ты добираешься на работу?</div>
      </div>

      <h3>HOW MUCH? - "Сколько?" (цена/количество неисчисл.) 💰</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>How much</strong> is it?</div>
        <div class="ru-ex">Сколько это стоит?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>How much</strong> water do you need?</div>
        <div class="ru-ex">Сколько воды тебе нужно?</div>
      </div>

      <h3>HOW MANY? - "Сколько?" (количество исчисл.) 🔢</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>How many</strong> books do you have?</div>
        <div class="ru-ex">Сколько у тебя книг?</div>
      </div>

      <h3>HOW OLD? - "Сколько лет?" 🎂</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>How old</strong> are you?</div>
        <div class="ru-ex">Сколько тебе лет?</div>
      </div>

      <h3>📊 Краткая таблица</h3>
      <div class="grammar-example-box">
        What? - Что? Какой?<br>
        Who? - Кто?<br>
        Where? - Где? Куда?<br>
        When? - Когда?<br>
        Why? - Почему?<br>
        How? - Как?<br>
        How much/many? - Сколько?<br>
        How old? - Сколько лет?
      </div>
    `
  },
  {
    id: 'a1_question_formation',
    title: "Making Questions",
    desc: "Как строить вопросы правильно.",
    icon: 'fa-question',
    content: `
      <h3>Главное правило</h3>
      <p>В английском СТРОГИЙ порядок слов в вопросе!</p>

      <h3>Общая схема</h3>
      <div class="grammar-example-box">
        <strong>Вопросительное слово + Вспомогательный глагол + Подлежащее + Основной глагол</strong>
      </div>

      <h3>1️⃣ Вопросы с глаголом BE (am/is/are/was/were)</h3>
      <p>Просто меняем местами BE и подлежащее:</p>

      <div class="grammar-example-box">
        Утверждение: He <strong>is</strong> happy.<br>
        Вопрос: <strong>Is</strong> he happy?
      </div>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>Are</strong> you a student?</div>
        <div class="ru-ex">Ты студент?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Was</strong> she at home?</div>
        <div class="ru-ex">Она была дома?</div>
      </div>

      <h3>2️⃣ Вопросы с другими глаголами (Present Simple)</h3>
      <p>Добавляем помощника <strong>DO</strong> или <strong>DOES</strong>:</p>

      <div class="grammar-example-box">
        Утверждение: You work.<br>
        Вопрос: <strong>Do</strong> you work?
      </div>

      <div class="grammar-example-box">
        Утверждение: She work<strong>s</strong>.<br>
        Вопрос: <strong>Does</strong> she work? (без -S!)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>Do</strong> you speak English?</div>
        <div class="ru-ex">Ты говоришь по-английски?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Does</strong> he like coffee?</div>
        <div class="ru-ex">Он любит кофе?</div>
      </div>

      <h3>3️⃣ Вопросы в Past Simple</h3>
      <p>Используем <strong>DID</strong> для всех:</p>

      <div class="grammar-example-box">
        Утверждение: You work<strong>ed</strong>.<br>
        Вопрос: <strong>Did</strong> you work? (глагол в начальной форме!)
      </div>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>Did</strong> you go to school?</div>
        <div class="ru-ex">Ты ходил в школу?</div>
      </div>

      <h3>4️⃣ Вопросы с вопросительными словами</h3>
      <p>Вопросительное слово ставим В НАЧАЛО:</p>

      <div class="grammar-example-box">
        <div class="en-ex"><strong>Where</strong> do you live?</div>
        <div class="ru-ex">Где ты живешь?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>What</strong> does she do?</div>
        <div class="ru-ex">Чем она занимается?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>When</strong> did you arrive?</div>
        <div class="ru-ex">Когда ты приехал?</div>
      </div>

      <h3>⚠️ Частые ошибки</h3>
      <ul>
        <li>❌ You are student? → ✅ <strong>Are</strong> you a student?</li>
        <li>❌ Where you live? → ✅ Where <strong>do</strong> you live?</li>
        <li>❌ Does he likes it? → ✅ Does he <strong>like</strong> it?</li>
        <li>❌ Did you went? → ✅ Did you <strong>go</strong>?</li>
      </ul>

      <h3>📊 Схема для запоминания</h3>
      <div class="grammar-example-box">
        <strong>С BE:</strong> (Where) + BE + подлежащее?<br>
        <strong>С другими глаголами:</strong> (Where) + DO/DOES/DID + подлежащее + глагол?
      </div>
    `
  },

  // --- WORD ORDER ---
  {
    id: 'a1_word_order',
    title: "Basic Word Order",
    desc: "Порядок слов в предложении.",
    icon: 'fa-sort-amount-down',
    content: `
      <h3>⚠️ Главное правило английского!</h3>
      <p>В английском языке НЕЛЬЗЯ менять слова местами как в русском! Порядок СТРОГИЙ.</p>

      <h3>Основная схема (SVO)</h3>
      <div class="grammar-example-box">
        <strong>1. Кто (подлежащее)</strong><br>
        <strong>2. Делает что (глагол)</strong><br>
        <strong>3. Что/Кого (дополнение)</strong><br>
        <strong>4. Где (место)</strong><br>
        <strong>5. Когда (время)</strong>
      </div>

      <h3>Примеры правильного порядка</h3>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>I</strong> bought <strong>a book</strong> in the shop yesterday.</div>
        <div class="ru-ex">Я купил книгу в магазине вчера.</div>
      </div>

      <p>В русском можем сказать по-разному:</p>
      <ul>
        <li>✅ Вчера я купил книгу в магазине</li>
        <li>✅ Книгу я купил вчера в магазине</li>
        <li>✅ В магазине я вчера купил книгу</li>
      </ul>

      <p>В английском ТОЛЬКО ТАК:</p>
      <div class="grammar-example-box">
        <div class="en-ex">✅ I bought a book in the shop yesterday.</div>
      </div>

      <p>Неправильно:</p>
      <ul>
        <li>❌ Yesterday I bought a book in the shop (можно, но реже)</li>
        <li>❌ A book I bought yesterday</li>
        <li>❌ In the shop I yesterday bought a book</li>
      </ul>

      <h3>Схема для разных случаев</h3>

      <div class="grammar-example-box">
        <strong>Простое предложение:</strong><br>
        I + work. (Я работаю.)
      </div>

      <div class="grammar-example-box">
        <strong>С дополнением:</strong><br>
        I + love + coffee. (Я люблю кофе.)
      </div>

      <div class="grammar-example-box">
        <strong>С местом:</strong><br>
        I + work + at home. (Я работаю дома.)
      </div>

      <div class="grammar-example-box">
        <strong>С местом и временем:</strong><br>
        I + work + at home + every day. (Я работаю дома каждый день.)
      </div>

      <h3>Больше примеров</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She <strong>reads</strong> books <strong>at home</strong> <strong>every evening</strong>.</div>
        <div class="ru-ex">Она читает книги дома каждый вечер.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">We <strong>met</strong> our friends <strong>at the cafe</strong> <strong>yesterday</strong>.</div>
        <div class="ru-ex">Мы встретили наших друзей в кафе вчера.</div>
      </div>

      <h3>🔑 Запомните</h3>
      <p><strong>Время</strong> обычно в КОНЦЕ предложения (но может быть и в начале для акцента):</p>
      <div class="grammar-example-box">
        <div class="en-ex">I go to work <strong>every day</strong>.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>Every day</strong> I go to work. (акцент на "каждый день")</div>
      </div>
    `
  },
  {
    id: 'a1_frequency_adverbs',
    title: "Adverbs of Frequency",
    desc: "Как часто: всегда, обычно, никогда.",
    icon: 'fa-sync',
    content: `
      <h3>Основные наречия частоты</h3>
      <ul>
        <li>always (100%) - всегда</li>
        <li>usually (90%) - обычно</li>
        <li>often (70%) - часто</li>
        <li>sometimes (50%) - иногда</li>
        <li>rarely (10%) - редко</li>
        <li>never (0%) - никогда</li>
      </ul>
      <h3>Место в предложении</h3>
      <p><strong>Перед основным глаголом:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">I always drink coffee.</div>
        <div class="ru-ex">Я всегда пью кофе.</div>
      </div>
      <p><strong>После глагола TO BE:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">She is always late.</div>
        <div class="ru-ex">Она всегда опаздывает.</div>
      </div>
      <h3>Every day/week/month</h3>
      <p>Ставим в конец предложения:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I go to gym every day.</div>
        <div class="ru-ex">Я хожу в зал каждый день.</div>
      </div>
    `
  }
],

      "A2": [
  // --- PRESENT TENSES ---
  {
    id: 'a2_present_simple_vs_continuous',
    title: "Present Simple vs Continuous",
    desc: "Когда какое время использовать.",
    icon: 'fa-exchange-alt',
    content: `
      <h3>Present Simple - постоянно</h3>
      <p>Факты, привычки, расписание, регулярные действия.</p>
      <div class="grammar-example-box">
        <div class="en-ex">I work in a bank.</div>
        <div class="ru-ex">Я работаю в банке (постоянно).</div>
      </div>
      <h3>Present Continuous - временно</h3>
      <p>Происходит сейчас или в текущий период.</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'm working from home this week.</div>
        <div class="ru-ex">Я работаю из дома на этой неделе.</div>
      </div>
      <h3>Слова-маркеры</h3>
      <ul>
        <li>Simple: always, usually, every day</li>
        <li>Continuous: now, at the moment, this week</li>
      </ul>
      <h3>Stative verbs (не используются в Continuous)</h3>
      <p>love, like, want, need, know, understand, believe</p>
      <div class="grammar-example-box">
        <div class="en-ex">I love you. ✓ (NOT: I'm loving)</div>
      </div>
    `
  },
  {
    id: 'a2_present_perfect',
    title: "Present Perfect",
    desc: "Связь прошлого с настоящим.",
    icon: 'fa-link',
    content: `
      <h3>Формула</h3>
      <p><strong>Have/Has + V3 (Past Participle)</strong></p>
      <ul>
        <li>I/You/We/They <strong>have</strong> done</li>
        <li>He/She/It <strong>has</strong> done</li>
      </ul>
      <h3>Когда используем?</h3>
      <p>1. <strong>Результат</strong> (важно ЧТО, а не КОГДА):</p>
      <div class="grammar-example-box">
        <div class="en-ex">I have bought a car.</div>
        <div class="ru-ex">Я купил машину (она у меня есть).</div>
      </div>
      <p>2. <strong>Опыт в жизни</strong>:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Have you ever been to Paris?</div>
        <div class="ru-ex">Ты когда-нибудь был в Париже?</div>
      </div>
      <p>3. <strong>Период не закончен</strong> (today, this week):</p>
      <div class="grammar-example-box">
        <div class="en-ex">I have drunk 3 cups today.</div>
        <div class="ru-ex">Я выпил 3 чашки сегодня.</div>
      </div>
      <h3>Слова-маркеры</h3>
      <p>just, already, yet, ever, never, recently, for, since</p>
    `
  },
  {
    id: 'a2_present_perfect_vs_past_simple',
    title: "Present Perfect vs Past Simple",
    desc: "Разница между временами.",
    icon: 'fa-balance-scale',
    content: `
      <h3>Past Simple - закончено</h3>
      <p>Действие в прошлом, время известно или важно.</p>
      <div class="grammar-example-box">
        <div class="en-ex">I bought a car yesterday.</div>
        <div class="ru-ex">Я купил машину вчера.</div>
      </div>
      <h3>Present Perfect - связь с настоящим</h3>
      <p>Результат важен сейчас, время не важно.</p>
      <div class="grammar-example-box">
        <div class="en-ex">I have bought a car.</div>
        <div class="ru-ex">Я купил машину (она есть у меня).</div>
      </div>
      <h3>Ключевое правило</h3>
      <p>❌ Нельзя Present Perfect с конкретным временем в прошлом:</p>
      <div class="grammar-example-box">
        <div class="en-ex">❌ I have seen him yesterday.</div>
        <div class="en-ex">✓ I saw him yesterday.</div>
      </div>
    `
  },

  // --- PAST TENSES ---
  {
    id: 'a2_past_continuous',
    title: "Past Continuous",
    desc: "Длительное действие в прошлом.",
    icon: 'fa-spinner',
    content: `
      <h3>Формула</h3>
      <p><strong>Was/Were + V-ing</strong></p>
      <h3>Использование</h3>
      <p>1. <strong>Процесс в конкретный момент</strong>:</p>
      <div class="grammar-example-box">
        <div class="en-ex">At 5 o'clock I was sleeping.</div>
        <div class="ru-ex">В 5 часов я спал.</div>
      </div>
      <p>2. <strong>Фон для другого действия</strong>:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I was watching TV when she called.</div>
        <div class="ru-ex">Я смотрел ТВ, когда она позвонила.</div>
      </div>
      <p>3. <strong>Два параллельных действия</strong>:</p>
      <div class="grammar-example-box">
        <div class="en-ex">While I was cooking, he was reading.</div>
        <div class="ru-ex">Пока я готовил, он читал.</div>
      </div>
    `
  },
  {
    id: 'a2_past_perfect',
    title: "Past Perfect",
    desc: "Действие до другого в прошлом.",
    icon: 'fa-step-backward',
    content: `
      <h3>Формула</h3>
      <p><strong>Had + V3 (Past Participle)</strong></p>
      <h3>Когда используем?</h3>
      <p>Показываем, что одно действие произошло <strong>раньше</strong> другого в прошлом.</p>
      <div class="grammar-example-box">
        <div class="en-ex">When I arrived, the film had already started.</div>
        <div class="ru-ex">Когда я пришел, фильм уже начался.</div>
      </div>
      <h3>Последовательность событий</h3>
      <p>1️⃣ Past Perfect (раньше) → 2️⃣ Past Simple (позже)</p>
      <div class="grammar-example-box">
        <div class="en-ex">I had finished work before she called.</div>
        <div class="ru-ex">Я закончил работу до того, как она позвонила.</div>
      </div>
      <h3>Слова-связки</h3>
      <p>after, before, when, by the time, already</p>
    `
  },

  // --- FUTURE ---
  {
    id: 'a2_will_vs_going_to',
    title: "Will vs Going to",
    desc: "Разные способы говорить о будущем.",
    icon: 'fa-crystal-ball',
    content: `
      <h3>WILL - спонтанные решения</h3>
      <p>Решение принято в момент речи:</p>
      <div class="grammar-example-box">
        <div class="en-ex">It's cold. I'll close the window.</div>
        <div class="ru-ex">Холодно. Я закрою окно.</div>
      </div>
      <h3>GOING TO - планы</h3>
      <p>Решение принято заранее:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'm going to buy a new phone tomorrow.</div>
        <div class="ru-ex">Я собираюсь купить новый телефон завтра.</div>
      </div>
      <h3>Прогнозы</h3>
      <p><strong>Will</strong> - мнение: I think it will rain.<br>
      <strong>Going to</strong> - есть признаки: Look at the clouds! It's going to rain.</p>
    `
  },
  {
    id: 'a2_present_cont_future',
    title: "Present Continuous для будущего",
    desc: "Запланированные встречи.",
    icon: 'fa-calendar-alt',
    content: `
      <h3>Фиксированные планы</h3>
      <p>Используем для договоренностей, где есть время/место:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'm meeting John at 5 pm.</div>
        <div class="ru-ex">Я встречаюсь с Джоном в 5 вечера.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">We're flying to Paris tomorrow.</div>
        <div class="ru-ex">Мы летим в Париж завтра.</div>
      </div>
      <h3>Сравнение</h3>
      <ul>
        <li><strong>Present Continuous</strong>: договоренности</li>
        <li><strong>Going to</strong>: намерения</li>
        <li><strong>Will</strong>: спонтанные решения</li>
      </ul>
    `
  },

  // --- MODALS ---
  {
    id: 'a2_have_to_must',
    title: "Must / Have to / Don't have to",
    desc: "Обязанности и необходимость.",
    icon: 'fa-exclamation-triangle',
    content: `
      <h3>Must - должен (сам так решил)</h3>
      <p>Личное мнение, внутренняя необходимость:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I must study harder.</div>
        <div class="ru-ex">Я должен учиться усерднее (сам так считаю).</div>
      </div>
      <h3>Have to - должен (правила)</h3>
      <p>Внешние обязательства, правила:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I have to wear a uniform at work.</div>
        <div class="ru-ex">Я должен носить форму на работе (правила).</div>
      </div>
      <h3>Don't have to - не обязан</h3>
      <p>Нет необходимости (но можно если хочешь):</p>
      <div class="grammar-example-box">
        <div class="en-ex">You don't have to come.</div>
        <div class="ru-ex">Тебе не обязательно приходить.</div>
      </div>
      <h3>Mustn't - нельзя</h3>
      <p>Запрещено:</p>
      <div class="grammar-example-box">
        <div class="en-ex">You mustn't smoke here.</div>
        <div class="ru-ex">Здесь нельзя курить.</div>
      </div>
    `
  },
  {
    id: 'a2_should',
    title: "Should / Shouldn't",
    desc: "Советы и рекомендации.",
    icon: 'fa-lightbulb',
    content: `
      <h3>Should - следует, стоит</h3>
      <p>Даем совет или рекомендацию:</p>
      <div class="grammar-example-box">
        <div class="en-ex">You should see a doctor.</div>
        <div class="ru-ex">Тебе следует пойти к врачу.</div>
      </div>
      <h3>Shouldn't - не следует</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You shouldn't eat so much sugar.</div>
        <div class="ru-ex">Тебе не следует есть так много сахара.</div>
      </div>
      <h3>Спрашиваем совет</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Should I call her?</div>
        <div class="ru-ex">Мне стоит ей позвонить?</div>
      </div>
    `
  },
  {
    id: 'a2_may_might',
    title: "May / Might (Возможность)",
    desc: "Может быть, возможно.",
    icon: 'fa-question',
    content: `
      <h3>May - возможно (50%)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It may rain tomorrow.</div>
        <div class="ru-ex">Завтра может пойти дождь.</div>
      </div>
      <h3>Might - возможно (30%)</h3>
      <p>Меньше уверенности, чем may:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I might go to the party.</div>
        <div class="ru-ex">Я, возможно, пойду на вечеринку.</div>
      </div>
      <h3>May для разрешения (формально)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">May I come in?</div>
        <div class="ru-ex">Можно войти?</div>
      </div>
      <h3>Отрицание</h3>
      <p>may not / might not = возможно не...</p>
    `
  },
  {
    id: 'a2_used_to',
    title: "Used to",
    desc: "Привычки в прошлом.",
    icon: 'fa-hourglass-half',
    content: `
      <h3>Что было раньше, но не сейчас</h3>
      <p><strong>Used to + глагол</strong> - регулярные действия или состояния в прошлом.</p>
      <div class="grammar-example-box">
        <div class="en-ex">I used to smoke.</div>
        <div class="ru-ex">Я раньше курил (сейчас нет).</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She used to be shy.</div>
        <div class="ru-ex">Она раньше была застенчивой.</div>
      </div>
      <h3>Вопрос и отрицание</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Did you use to play tennis?</div>
        <div class="en-ex">I didn't use to like coffee.</div>
      </div>
      <h3>⚠️ Не путать</h3>
      <p>Used to (раньше делал) ≠ Be used to (привык к)</p>
    `
  },
  {
    id: 'a2_verb_go',
    title: "Глагол GO",
    desc: "Разные значения и использования.",
    icon: 'fa-walking',
    content: `
      <h3>Go + места</h3>
      <ul>
        <li>go home (домой)</li>
        <li>go to work (на работу)</li>
        <li>go to bed (спать)</li>
        <li>go abroad (за границу)</li>
      </ul>
      <h3>Go + -ing (активности)</h3>
      <ul>
        <li>go shopping (за покупками)</li>
        <li>go swimming (плавать)</li>
        <li>go dancing (танцевать)</li>
        <li>go sightseeing (осматривать достоприм.)</li>
      </ul>
      <h3>Go + прилагательное (становиться)</h3>
      <ul>
        <li>go crazy (сойти с ума)</li>
        <li>go wrong (пойти не так)</li>
        <li>go bad (испортиться)</li>
      </ul>
      <h3>Фразы</h3>
      <ul>
        <li>go for a walk (прогуляться)</li>
        <li>go on holiday (в отпуск)</li>
        <li>go by bus/car (на автобусе/машине)</li>
      </ul>
    `
  },
  {
    id: 'a2_verb_get',
    title: "Глагол GET",
    desc: "Множество значений GET.",
    icon: 'fa-hand-rock',
    content: `
      <h3>Get = получать/доставать</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I got a letter.</div>
        <div class="ru-ex">Я получил письмо.</div>
      </div>
      <h3>Get = становиться</h3>
      <p>get + прилагательное:</p>
      <ul>
        <li>get tired (уставать)</li>
        <li>get angry (злиться)</li>
        <li>get married (жениться)</li>
        <li>get lost (потеряться)</li>
      </ul>
      <h3>Get = добираться</h3>
      <div class="grammar-example-box">
        <div class="en-ex">How do you get to work?</div>
        <div class="ru-ex">Как ты добираешься на работу?</div>
      </div>
      <h3>Фразовые глаголы</h3>
      <ul>
        <li>get up (вставать)</li>
        <li>get on/off (садиться/выходить из транспорта)</li>
        <li>get in/out (садиться/выходить из машины)</li>
        <li>get back (возвращаться)</li>
      </ul>
    `
  },
  {
    id: 'a2_do_vs_make',
    title: "DO vs MAKE",
    desc: "Когда do, а когда make?",
    icon: 'fa-hammer',
    content: `
      <h3>DO - выполнять действия</h3>
      <p>Общие действия, задачи, работа:</p>
      <ul>
        <li>do homework (делать домашку)</li>
        <li>do the dishes (мыть посуду)</li>
        <li>do exercise (делать упражнения)</li>
        <li>do business (вести бизнес)</li>
        <li>do your best (стараться)</li>
        <li>do a favor (оказать услугу)</li>
      </ul>
      <h3>MAKE - создавать, производить</h3>
      <p>Создание, производство, результат:</p>
      <ul>
        <li>make coffee (готовить кофе)</li>
        <li>make a mistake (сделать ошибку)</li>
        <li>make money (зарабатывать)</li>
        <li>make a decision (принять решение)</li>
        <li>make friends (заводить друзей)</li>
        <li>make noise (шуметь)</li>
      </ul>
    `
  },
  {
    id: 'a2_two_objects',
    title: "Verbs with Two Objects",
    desc: "Глаголы с двумя дополнениями.",
    icon: 'fa-gift',
    content: `
      <h3>Что это?</h3>
      <p>Некоторые глаголы могут иметь два дополнения: кому? и что?</p>
      <h3>Два варианта порядка</h3>
      <p><strong>Вариант 1:</strong> глагол + человек + вещь</p>
      <div class="grammar-example-box">
        <div class="en-ex">I gave him a book.</div>
        <div class="ru-ex">Я дал ему книгу.</div>
      </div>
      <p><strong>Вариант 2:</strong> глагол + вещь + to/for + человек</p>
      <div class="grammar-example-box">
        <div class="en-ex">I gave a book to him.</div>
        <div class="ru-ex">Я дал книгу ему.</div>
      </div>
      <h3>Основные глаголы</h3>
      <ul>
        <li>give, send, show, tell, teach + TO</li>
        <li>buy, make, cook, get + FOR</li>
      </ul>
    `
  },
  {
    id: 'a2_stative_verbs',
    title: "Stative vs Dynamic Verbs",
    desc: "Глаголы состояния и действия.",
    icon: 'fa-pause',
    content: `
      <h3>Stative Verbs (состояния)</h3>
      <p>НЕ используются в Continuous!</p>
      <h4>Чувства и эмоции:</h4>
      <ul>
        <li>love, like, hate, prefer, want</li>
      </ul>
      <h4>Мыслительные процессы:</h4>
      <ul>
        <li>know, understand, believe, remember, forget</li>
      </ul>
      <h4>Владение и отношения:</h4>
      <ul>
        <li>have (иметь), own, belong, contain</li>
      </ul>
      <h4>Восприятие:</h4>
      <ul>
        <li>see, hear, smell, taste (когда не намеренно)</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">❌ I'm knowing the answer.</div>
        <div class="en-ex">✓ I know the answer.</div>
      </div>
      <h3>Dynamic Verbs (действия)</h3>
      <p>МОГУТ использоваться в Continuous:</p>
      <p>work, run, eat, play, study, etc.</p>
    `
  },
  {
    id: 'a2_phrasal_verbs',
    title: "Phrasal Verbs Basics",
    desc: "Основы фразовых глаголов.",
    icon: 'fa-puzzle-piece',
    content: `
      <h3>Что это?</h3>
      <p>Глагол + частица (up, down, in, out, on, off) = новое значение</p>
      <h3>Разделяемые (Separable)</h3>
      <p>Можно разделить дополнением:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Turn off the TV. = Turn the TV off.</div>
        <div class="ru-ex">Выключи телевизор.</div>
      </div>
      <p>С местоимением - ТОЛЬКО разделяем:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Turn it off. ✓ (NOT: Turn off it)</div>
      </div>
      <h3>Неразделяемые (Inseparable)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Look after the baby. ✓</div>
        <div class="en-ex">Look the baby after. ❌</div>
      </div>
      <h3>Популярные фразовые глаголы</h3>
      <ul>
        <li>wake up - просыпаться</li>
        <li>get up - вставать</li>
        <li>put on - надевать</li>
        <li>take off - снимать</li>
        <li>turn on/off - включать/выключать</li>
        <li>give up - сдаваться</li>
        <li>look for - искать</li>
      </ul>
    `
  },

  // --- CONDITIONALS ---
  {
    id: 'a2_first_conditional',
    title: "First Conditional",
    desc: "Реальное условие в будущем.",
    icon: 'fa-cloud-sun',
    content: `
      <h3>Формула</h3>
      <p><strong>If + Present Simple, will + глагол</strong></p>
      <h3>Использование</h3>
      <p>Реальные ситуации в будущем (может произойти):</p>
      <div class="grammar-example-box">
        <div class="en-ex">If it rains, I will stay at home.</div>
        <div class="ru-ex">Если пойдет дождь, я останусь дома.</div>
      </div>
      <h3>Варианты</h3>
      <p>Можно менять части местами:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I will help you if you ask me.</div>
      </div>
      <p>Вместо will можно: can, may, might, should</p>
      <div class="grammar-example-box">
        <div class="en-ex">If you study hard, you can pass the exam.</div>
      </div>
      <h3>When, as soon as, before, after</h3>
      <p>Работают как if - после них Present, не Future:</p>
      <div class="grammar-example-box">
        <div class="en-ex">When I get home, I'll call you.</div>
      </div>
    `
  },
  {
    id: 'a2_second_conditional',
    title: "Second Conditional",
    desc: "Нереальное условие.",
    icon: 'fa-magic',
    content: `
      <h3>Формула</h3>
      <p><strong>If + Past Simple, would + глагол</strong></p>
      <h3>Использование</h3>
      <p>Воображаемые, нереальные ситуации:</p>
      <div class="grammar-example-box">
        <div class="en-ex">If I had a million dollars, I would travel.</div>
        <div class="ru-ex">Если бы у меня был миллион, я бы путешествовал.</div>
      </div>
      <h3>Советы</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If I were you, I would accept the offer.</div>
        <div class="ru-ex">На твоем месте я бы принял предложение.</div>
      </div>
      <h3>⚠️ Важно</h3>
      <p>После if используем were для всех лиц (формально):</p>
      <div class="grammar-example-box">
        <div class="en-ex">If I were rich... (NOT: If I was...)</div>
      </div>
    `
  },

  // --- PASSIVE ---
  {
    id: 'a2_passive_basics',
    title: "Passive Voice (Present & Past)",
    desc: "Страдательный залог: базовые времена.",
    icon: 'fa-exchange-alt',
    content: `
      <h3>Когда используем?</h3>
      <p>1. Не знаем или не важно КТО делает<br>
      2. Важнее действие, а не исполнитель</p>
      <h3>Present Simple Passive</h3>
      <p><strong>am/is/are + V3</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">Coffee is grown in Brazil.</div>
        <div class="ru-ex">Кофе выращивается в Бразилии.</div>
      </div>
      <h3>Past Simple Passive</h3>
      <p><strong>was/were + V3</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">The house was built in 1990.</div>
        <div class="ru-ex">Дом был построен в 1990.</div>
      </div>
      <h3>Добавляем исполнителя (by)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">This book was written by Tolstoy.</div>
        <div class="ru-ex">Эта книга была написана Толстым.</div>
      </div>
    `
  },

  // --- REPORTED SPEECH ---
  {
    id: 'a2_reported_speech',
    title: "Reported Speech",
    desc: "Косвенная речь: передаем чужие слова.",
    icon: 'fa-quote-right',
    content: `
      <h3>Что это?</h3>
      <p>Передаем слова другого человека не дословно.</p>
      <h3>Основные изменения</h3>
      <p>Present → Past:</p>
      <div class="grammar-example-box">
        <div class="en-ex">"I am tired" → He said he was tired.</div>
      </div>
      <p>Will → Would:</p>
      <div class="grammar-example-box">
        <div class="en-ex">"I will help" → She said she would help.</div>
      </div>
      <p>Can → Could:</p>
      <div class="grammar-example-box">
        <div class="en-ex">"I can swim" → He said he could swim.</div>
      </div>
      <h3>Местоимения и указатели</h3>
      <ul>
        <li>I → he/she</li>
        <li>my → his/her</li>
        <li>this → that</li>
        <li>here → there</li>
        <li>today → that day</li>
        <li>tomorrow → the next day</li>
      </ul>
      <h3>Say vs Tell</h3>
      <p>Say - без указания кому<br>
      Tell - обязательно кому</p>
      <div class="grammar-example-box">
        <div class="en-ex">He said (that) he was busy.</div>
        <div class="en-ex">He told me (that) he was busy.</div>
      </div>
    `
  },

  // --- INFINITIVE & GERUND ---
  {
    id: 'a2_purpose_to_for',
    title: "Purpose: TO and FOR",
    desc: "Выражаем цель: зачем, для чего.",
    icon: 'fa-bullseye',
    content: `
      <h3>TO + глагол (чтобы)</h3>
      <p>Объясняем ЗАЧЕМ делаем действие:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I went to the shop to buy milk.</div>
        <div class="ru-ex">Я пошел в магазин купить молоко.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">She studies hard to pass exams.</div>
        <div class="ru-ex">Она усердно учится, чтобы сдать экзамены.</div>
      </div>
      <h3>FOR + существительное/герундий</h3>
      <p>Для чего предназначено:</p>
      <div class="grammar-example-box">
        <div class="en-ex">This knife is for cutting bread.</div>
        <div class="ru-ex">Этот нож для резки хлеба.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">I bought flowers for my mom.</div>
        <div class="ru-ex">Я купил цветы для мамы.</div>
      </div>
    `
  },
  {
    id: 'a2_verb_patterns',
    title: "Verb Patterns: -ing or to?",
    desc: "После каких глаголов что использовать.",
    icon: 'fa-code-branch',
    content: `
      <h3>Verb + TO infinitive</h3>
      <ul>
        <li>want to do</li>
        <li>need to go</li>
        <li>decide to stay</li>
        <li>hope to see</li>
        <li>plan to visit</li>
        <li>promise to help</li>
        <li>agree to come</li>
        <li>refuse to pay</li>
      </ul>
      <h3>Verb + -ING</h3>
      <ul>
        <li>enjoy reading</li>
        <li>finish working</li>
        <li>suggest going</li>
        <li>avoid making</li>
        <li>consider buying</li>
        <li>keep trying</li>
        <li>miss living</li>
      </ul>
      <h3>Verb + TO или -ING (смысл одинаковый)</h3>
      <ul>
        <li>like to do / like doing</li>
        <li>love to do / love doing</li>
        <li>hate to do / hate doing</li>
        <li>start to do / start doing</li>
        <li>begin to do / begin doing</li>
      </ul>
    `
  },

  // --- PRONOUNS & DETERMINERS ---
  {
    id: 'a2_all_pronouns',
    title: "All Types of Pronouns",
    desc: "Все виды местоимений.",
    icon: 'fa-users',
    content: `
      <h3>Subject Pronouns (кто?)</h3>
      <p>I, you, he, she, it, we, they</p>
      <h3>Object Pronouns (кого?)</h3>
      <p>me, you, him, her, it, us, them</p>
      <h3>Possessive Adjectives (чей? + сущ.)</h3>
      <p>my, your, his, her, its, our, their</p>
      <div class="grammar-example-box">
        <div class="en-ex">This is my book.</div>
      </div>
      <h3>Possessive Pronouns (чей? без сущ.)</h3>
      <p>mine, yours, his, hers, ours, theirs</p>
      <div class="grammar-example-box">
        <div class="en-ex">This book is mine.</div>
      </div>
      <h3>Сравнение</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It's my car. = It's mine.</div>
        <div class="en-ex">It's her bag. = It's hers.</div>
      </div>
    `
  },
  {
    id: 'a2_something_anything',
    title: "Something, Anything, Nothing",
    desc: "Неопределенные местоимения.",
    icon: 'fa-asterisk',
    content: `
      <h3>Some- (в утверждениях)</h3>
      <ul>
        <li>something - что-то</li>
        <li>somebody/someone - кто-то</li>
        <li>somewhere - где-то</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">I need something to eat.</div>
      </div>
      <h3>Any- (в вопросах и отрицаниях)</h3>
      <ul>
        <li>anything - что-нибудь</li>
        <li>anybody/anyone - кто-нибудь</li>
        <li>anywhere - где-нибудь</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">Is there anybody home?</div>
        <div class="en-ex">I don't see anything.</div>
      </div>
      <h3>No- (отрицание)</h3>
      <ul>
        <li>nothing - ничего</li>
        <li>nobody/no one - никто</li>
        <li>nowhere - нигде</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">There's nothing to do.</div>
      </div>
      <h3>Every- (все)</h3>
      <ul>
        <li>everything - всё</li>
        <li>everybody/everyone - все (люди)</li>
        <li>everywhere - везде</li>
      </ul>
    `
  },
  {
    id: 'a2_quantifiers_extended',
    title: "Extended Quantifiers",
    desc: "Расширенные квантификаторы.",
    icon: 'fa-chart-pie',
    content: `
      <h3>Much / Many (много)</h3>
      <p>В вопросах и отрицаниях:</p>
      <ul>
        <li>much + неисчисляемое</li>
        <li>many + исчисляемое мн.ч.</li>
      </ul>
      <h3>Little / Few (мало)</h3>
      <ul>
        <li>little + неисчисляемое (мало)</li>
        <li>a little + неисчисляемое (немного)</li>
        <li>few + исчисляемое (мало)</li>
        <li>a few + исчисляемое (несколько)</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">Few people came. (Мало людей пришло - плохо)</div>
        <div class="en-ex">A few people came. (Несколько человек пришло - нормально)</div>
      </div>
      <h3>Some / Any</h3>
      <p>some - утверждения, предложения<br>
      any - вопросы, отрицания</p>
      <div class="grammar-example-box">
        <div class="en-ex">Would you like some tea? (предложение)</div>
      </div>
    `
  },
  {
    id: 'a2_too_enough',
    title: "Too, Too much/many, Enough",
    desc: "Слишком и достаточно.",
    icon: 'fa-balance-scale-left',
    content: `
      <h3>Too + прилагательное (слишком)</h3>
      <p>Негативное значение - чрезмерно:</p>
      <div class="grammar-example-box">
        <div class="en-ex">This coffee is too hot.</div>
        <div class="ru-ex">Этот кофе слишком горячий.</div>
      </div>
      <h3>Too much/many (слишком много)</h3>
      <ul>
        <li>too much + неисчисляемое</li>
        <li>too many + исчисляемое мн.ч.</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">Too much sugar, too many calories.</div>
      </div>
      <h3>Enough (достаточно)</h3>
      <p>Прилагательное + enough:</p>
      <div class="grammar-example-box">
        <div class="en-ex">He isn't tall enough.</div>
      </div>
      <p>Enough + существительное:</p>
      <div class="grammar-example-box">
        <div class="en-ex">We have enough time.</div>
      </div>
    `
  },
  {
    id: 'a2_most',
    title: "Most, Most of, The most",
    desc: "Разные значения most.",
    icon: 'fa-crown',
    content: `
      <h3>Most + существительное (большинство)</h3>
      <p>Говорим о людях/вещах в общем:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Most people like pizza.</div>
        <div class="ru-ex">Большинство людей любят пиццу.</div>
      </div>
      <h3>Most of + the/my/these + сущ.</h3>
      <p>Конкретная группа:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Most of my friends speak English.</div>
        <div class="ru-ex">Большинство моих друзей говорят по-английски.</div>
      </div>
      <h3>The most + прилагательное</h3>
      <p>Превосходная степень (самый):</p>
      <div class="grammar-example-box">
        <div class="en-ex">This is the most expensive restaurant.</div>
        <div class="ru-ex">Это самый дорогой ресторан.</div>
      </div>
    `
  },

  // --- RELATIVE CLAUSES ---
  {
    id: 'a2_relative_clauses',
    title: "Relative Clauses: Who, Which, That",
    desc: "Определительные придаточные.",
    icon: 'fa-link',
    content: `
      <h3>WHO - для людей</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The man who lives next door is a doctor.</div>
        <div class="ru-ex">Мужчина, который живет по соседству, - доктор.</div>
      </div>
      <h3>WHICH - для вещей</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The book which I bought is interesting.</div>
        <div class="ru-ex">Книга, которую я купил, интересная.</div>
      </div>
      <h3>THAT - универсальный</h3>
      <p>Можно использовать и для людей, и для вещей:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The girl that works here is my sister.</div>
        <div class="en-ex">The car that I bought is red.</div>
      </div>
      <h3>WHERE - для мест</h3>
      <div class="grammar-example-box">
        <div class="en-ex">This is the restaurant where we met.</div>
        <div class="ru-ex">Это ресторан, где мы встретились.</div>
      </div>
    `
  },

  // --- AUXILIARY VERBS ---
  {
    id: 'a2_so_neither',
    title: "So am I, Neither do I",
    desc: "Я тоже / Я тоже не.",
    icon: 'fa-copy',
    content: `
      <h3>So + вспом. глагол + I (я тоже)</h3>
      <p>Соглашаемся с положительным утверждением:</p>
      <div class="grammar-example-box">
        <div class="en-ex">A: I'm tired. B: So am I.</div>
        <div class="ru-ex">А: Я устал. Б: Я тоже.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">A: I like pizza. B: So do I.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">A: I can swim. B: So can I.</div>
      </div>
      <h3>Neither + вспом. глагол + I (я тоже не)</h3>
      <p>Соглашаемся с отрицательным утверждением:</p>
      <div class="grammar-example-box">
        <div class="en-ex">A: I don't smoke. B: Neither do I.</div>
        <div class="ru-ex">А: Я не курю. Б: Я тоже.</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">A: I can't dance. B: Neither can I.</div>
      </div>
      <h3>Правило</h3>
      <p>Используем тот же вспомогательный глагол, что в первом предложении.</p>
    `
  },

  // --- ADJECTIVES & ADVERBS ---
  {
    id: 'a2_comparison_review',
    title: "Comparatives & Superlatives Review",
    desc: "Полный обзор сравнений.",
    icon: 'fa-sort',
    content: `
      <h3>Comparatives (сравнительная)</h3>
      <p><strong>Короткие (1-2 слога):</strong> -er</p>
      <ul>
        <li>fast → faster</li>
        <li>big → bigger (удваиваем согласную)</li>
        <li>happy → happier (y → i)</li>
      </ul>
      <p><strong>Длинные (3+ слога):</strong> more</p>
      <ul>
        <li>expensive → more expensive</li>
      </ul>
      <h3>Superlatives (превосходная)</h3>
      <p><strong>Короткие:</strong> the -est</p>
      <ul>
        <li>fast → the fastest</li>
      </ul>
      <p><strong>Длинные:</strong> the most</p>
      <ul>
        <li>expensive → the most expensive</li>
      </ul>
      <h3>Исключения</h3>
      <ul>
        <li>good → better → the best</li>
        <li>bad → worse → the worst</li>
        <li>far → further → the furthest</li>
      </ul>
      <h3>As...as (такой же)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She is as tall as her mother.</div>
      </div>
    `
  },
  {
    id: 'a2_no_longer',
    title: "No longer, Not anymore",
    desc: "Больше не.",
    icon: 'fa-times-circle',
    content: `
      <h3>No longer (больше не)</h3>
      <p>Формальный стиль, в середине предложения:</p>
      <div class="grammar-example-box">
        <div class="en-ex">She no longer works here.</div>
        <div class="ru-ex">Она больше здесь не работает.</div>
      </div>
      <h3>Not...any longer</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She doesn't work here any longer.</div>
      </div>
      <h3>Not...anymore</h3>
      <p>Разговорный стиль, в конце предложения:</p>
      <div class="grammar-example-box">
        <div class="en-ex">She doesn't work here anymore.</div>
      </div>
      <h3>Used to для контраста</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I used to smoke, but I don't anymore.</div>
        <div class="ru-ex">Я раньше курил, но больше не курю.</div>
      </div>
    `
  },

  // --- CONJUNCTIONS ---
  {
    id: 'a2_conjunctions',
    title: "Conjunctions & Connectors",
    desc: "Связующие слова.",
    icon: 'fa-link',
    content: `
      <h3>However (однако)</h3>
      <p>Начинаем новое предложение:</p>
      <div class="grammar-example-box">
        <div class="en-ex">It's expensive. However, it's worth it.</div>
      </div>
      <h3>Although (хотя)</h3>
      <p>В начале или середине предложения:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Although it's expensive, I'll buy it.</div>
        <div class="en-ex">I'll buy it although it's expensive.</div>
      </div>
      <h3>Because (потому что) / So (поэтому)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I stayed home because I was sick.</div>
        <div class="en-ex">I was sick, so I stayed home.</div>
      </div>
      <h3>Time connectors</h3>
      <ul>
        <li>First - сначала</li>
        <li>Then - затем</li>
        <li>After that - после этого</li>
        <li>Finally - наконец</li>
        <li>Meanwhile - тем временем</li>
      </ul>
    `
  },

  // --- PREPOSITIONS ---
  {
    id: 'a2_prepositions_movement',
    title: "Prepositions of Movement",
    desc: "Предлоги движения.",
    icon: 'fa-arrows-alt',
    content: `
      <h3>Основные предлоги движения</h3>
      <ul>
        <li><strong>to</strong> - к, в (направление)</li>
        <li><strong>from</strong> - из, от</li>
        <li><strong>into</strong> - внутрь</li>
        <li><strong>out of</strong> - из (изнутри)</li>
        <li><strong>onto</strong> - на (поверхность)</li>
        <li><strong>off</strong> - с (поверхности)</li>
      </ul>
      <h3>Through, Along, Across, Over</h3>
      <ul>
        <li><strong>through</strong> - через (насквозь)</li>
        <li><strong>along</strong> - вдоль</li>
        <li><strong>across</strong> - через (поверхность)</li>
        <li><strong>over</strong> - над, через (сверху)</li>
      </ul>
      <h3>Up, Down, Around</h3>
      <ul>
        <li><strong>up</strong> - вверх</li>
        <li><strong>down</strong> - вниз</li>
        <li><strong>around</strong> - вокруг</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">Walk across the street, then along the river.</div>
        <div class="en-ex">The cat jumped onto the table.</div>
      </div>
    `
  },
  {
    id: 'a2_time_expressions',
    title: "On time vs In time",
    desc: "Различия временных выражений.",
    icon: 'fa-clock',
    content: `
      <h3>On time = вовремя (по расписанию)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The train arrived on time.</div>
        <div class="ru-ex">Поезд прибыл вовремя (по расписанию).</div>
      </div>
      <h3>In time = вовремя (успеть)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I arrived in time for the meeting.</div>
        <div class="ru-ex">Я приехал вовремя на встречу (успел).</div>
      </div>
      <h3>At the end = в конце (чего-то)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">At the end of the film.</div>
      </div>
      <h3>In the end = в конце концов</h3>
      <div class="grammar-example-box">
        <div class="en-ex">In the end, we stayed home.</div>
        <div class="ru-ex">В конце концов, мы остались дома.</div>
      </div>
      <h3>At last = наконец-то</h3>
      <div class="grammar-example-box">
        <div class="en-ex">At last, you're here!</div>
      </div>
    `
  },

  // --- QUESTIONS ---
  {
    id: 'a2_question_forms',
    title: "All Question Forms",
    desc: "Все типы вопросов.",
    icon: 'fa-question-circle',
    content: `
      <h3>Yes/No вопросы</h3>
      <p>Вспомогательный глагол + подлежащее + основной глагол:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Do you like coffee?</div>
        <div class="en-ex">Can she swim?</div>
        <div class="en-ex">Have you been to Paris?</div>
      </div>
      <h3>Wh- вопросы</h3>
      <p>Вопр. слово + вспом. глагол + подлежащее + осн. глагол:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Where do you live?</div>
        <div class="en-ex">What are you doing?</div>
      </div>
      <h3>Subject вопросы (Кто? Что?)</h3>
      <p>Вопросительное слово = подлежащее (без вспом. глагола):</p>
      <div class="grammar-example-box">
        <div class="en-ex">Who called you? (Кто звонил?)</div>
        <div class="en-ex">What happened? (Что случилось?)</div>
      </div>
      <h3>Indirect вопросы (вежливые)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Could you tell me where the bank is?</div>
      </div>
    `
  },
  {
    id: 'a2_questions_prepositions',
    title: "Questions with Prepositions",
    desc: "Вопросы с предлогами.",
    icon: 'fa-question',
    content: `
      <h3>Предлог в конце</h3>
      <p>В разговорном английском предлог идет в конец:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Who are you talking to?</div>
        <div class="ru-ex">С кем ты говоришь?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">What are you looking for?</div>
        <div class="ru-ex">Что ты ищешь?</div>
      </div>
      <div class="grammar-example-box">
        <div class="en-ex">Where are you from?</div>
        <div class="ru-ex">Откуда ты?</div>
      </div>
      <h3>Формальный стиль</h3>
      <p>Предлог перед вопросительным словом (редко):</p>
      <div class="grammar-example-box">
        <div class="en-ex">To whom are you speaking? (формально)</div>
      </div>
      <h3>Популярные комбинации</h3>
      <ul>
        <li>What...for? - Зачем?</li>
        <li>Who...with? - С кем?</li>
        <li>What...about? - О чем?</li>
        <li>Who...to? - Кому?</li>
      </ul>
    `
  }
],

      "B1": [
  // --- PRESENT TENSES ---
  {
    id: 'b1_present_review',
    title: "Present Simple vs Continuous",
    desc: "Углубленное сравнение настоящих времен.",
    icon: 'fa-sync',
    content: `
      <h3>Постоянное vs Временное</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I work in London. (постоянно)</div>
        <div class="en-ex">I'm working in London this month. (временно)</div>
      </div>
      <h3>Stative verbs - исключения</h3>
      <p>Некоторые глаголы состояния МОГУТ использоваться в Continuous с изменением смысла:</p>
      <ul>
        <li><strong>think</strong>: I think it's good (мнение) vs I'm thinking about it (процесс размышления)</li>
        <li><strong>have</strong>: I have a car (владею) vs I'm having lunch (процесс)</li>
        <li><strong>see</strong>: I see you (вижу) vs I'm seeing John tonight (встречаюсь)</li>
      </ul>
      <h3>Раздражение (always + continuous)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He's always complaining!</div>
        <div class="ru-ex">Он вечно жалуется! (раздражение)</div>
      </div>
    `
  },
  {
    id: 'b1_past_vs_pp',
    title: "Past Simple vs Present Perfect",
    desc: "Мастерское владение разницей.",
    icon: 'fa-balance-scale',
    content: `
      <h3>Ключевая разница</h3>
      <p><strong>Past Simple</strong> = законченный период<br>
      <strong>Present Perfect</strong> = незаконченный период или результат</p>
      <h3>Временные маркеры</h3>
      <ul>
        <li><strong>Past Simple:</strong> yesterday, last week, in 2020, when I was young</li>
        <li><strong>Present Perfect:</strong> today, this week, recently, ever, never, just, already, yet</li>
      </ul>
      <h3>Life experience (опыт)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Have you ever been to Japan?</div>
        <div class="en-ex">Yes, I have. I went there last year.</div>
      </div>
      <p>Первый вопрос - опыт (PP), ответ с деталями - Past Simple</p>
      <h3>Finished vs Unfinished time</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I saw him this morning. (утро закончилось)</div>
        <div class="en-ex">I've seen him this morning. (утро еще идет)</div>
      </div>
    `
  },
  {
    id: 'b1_pp_continuous',
    title: "Present Perfect Continuous",
    desc: "Длительность действия до настоящего момента.",
    icon: 'fa-stopwatch',
    content: `
      <h3>Формула</h3>
      <p><strong>Have/Has been + V-ing</strong></p>
      <h3>Использование</h3>
      <p>1. <strong>Длительность до сейчас</strong> (с for/since):</p>
      <div class="grammar-example-box">
        <div class="en-ex">I've been waiting for 2 hours.</div>
        <div class="ru-ex">Я жду уже 2 часа.</div>
      </div>
      <p>2. <strong>Недавно закончилось</strong> (видны результаты):</p>
      <div class="grammar-example-box">
        <div class="en-ex">You're wet! Have you been running?</div>
        <div class="ru-ex">Ты мокрый! Ты бегал?</div>
      </div>
      <h3>PP Simple vs PP Continuous</h3>
      <p><strong>Simple</strong> - результат/количество:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I've read 3 books. (сколько)</div>
      </div>
      <p><strong>Continuous</strong> - процесс/длительность:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I've been reading all day. (как долго)</div>
      </div>
      <h3>For vs Since</h3>
      <ul>
        <li><strong>For</strong> + период: for 2 hours, for 3 years</li>
        <li><strong>Since</strong> + точка начала: since 2020, since Monday</li>
      </ul>
    `
  },

  // --- PAST TENSES ---
  {
    id: 'b1_past_tenses',
    title: "All Past Tenses",
    desc: "Past Simple, Continuous, Perfect.",
    icon: 'fa-history',
    content: `
      <h3>Past Simple - факты</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I worked yesterday.</div>
      </div>
      <h3>Past Continuous - фон/процесс</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I was working when you called.</div>
      </div>
      <h3>Past Perfect - предпрошедшее</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I had finished before he arrived.</div>
      </div>
      <h3>Комбинирование времен</h3>
      <p>Типичные комбинации в рассказах:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I was walking home when I realized I had forgotten my keys.</div>
        <div class="ru-ex">Я шел домой, когда понял, что забыл ключи.</div>
      </div>
      <h3>While vs When</h3>
      <ul>
        <li><strong>While</strong> + Past Continuous (длительное)</li>
        <li><strong>When</strong> + Past Simple (момент)</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">While I was cooking, the phone rang.</div>
        <div class="en-ex">I was cooking when the phone rang.</div>
      </div>
    `
  },

  // --- FUTURE ---
  {
    id: 'b1_future_forms',
    title: "All Future Forms",
    desc: "Will, going to, Present Continuous.",
    icon: 'fa-rocket',
    content: `
      <h3>Will - предсказания и решения</h3>
      <ul>
        <li>Предсказания с think/probably: I think it will rain</li>
        <li>Спонтанные решения: I'll help you</li>
        <li>Обещания: I'll call you later</li>
      </ul>
      <h3>Going to - планы и очевидность</h3>
      <ul>
        <li>Намерения: I'm going to study harder</li>
        <li>Очевидные предсказания: Look! It's going to fall!</li>
      </ul>
      <h3>Present Continuous - договоренности</h3>
      <ul>
        <li>Фиксированные планы: I'm meeting Tom at 5</li>
        <li>Обычно с указанием времени/места</li>
      </ul>
      <h3>Present Simple - расписания</h3>
      <ul>
        <li>Официальные расписания: The train leaves at 6</li>
        <li>Программы: The film starts at 8</li>
      </ul>
      <h3>Future time clauses</h3>
      <p>После when, as soon as, before, after, until - НЕ будущее!</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'll call you when I arrive. (NOT: when I will arrive)</div>
      </div>
    `
  },

  // --- MODALS ---
  {
    id: 'b1_obligation_modals',
    title: "Have to, Must, Should",
    desc: "Обязательства, необходимость, советы.",
    icon: 'fa-exclamation-triangle',
    content: `
      <h3>Must vs Have to</h3>
      <p><strong>Must</strong> - личное мнение, важность для говорящего:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I must call my mom. (я сам так решил)</div>
      </div>
      <p><strong>Have to</strong> - внешние правила, обстоятельства:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I have to wear a uniform. (правила компании)</div>
      </div>
      <h3>В прошлом и будущем</h3>
      <p>Must не имеет форм прошлого/будущего, используем had to/will have to:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I had to work yesterday.</div>
        <div class="en-ex">I'll have to work tomorrow.</div>
      </div>
      <h3>Should для советов</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You should see a doctor. (совет)</div>
        <div class="en-ex">You shouldn't smoke. (совет против)</div>
      </div>
      <h3>Ought to = should (формально)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You ought to apologize.</div>
      </div>
    `
  },
  {
    id: 'b1_ability_modals',
    title: "Can, Could, Be able to",
    desc: "Способности и возможности.",
    icon: 'fa-dumbbell',
    content: `
      <h3>Can - способность сейчас</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I can swim. (умею)</div>
        <div class="en-ex">Can you help me? (можешь?)</div>
      </div>
      <h3>Could - прошлое или вежливость</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I could swim when I was 5. (мог в прошлом)</div>
        <div class="en-ex">Could you help me? (вежливая просьба)</div>
      </div>
      <h3>Be able to - все времена</h3>
      <p>Используем когда can/could невозможны:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'll be able to help tomorrow. (future)</div>
        <div class="en-ex">I've been able to swim since I was 5. (present perfect)</div>
      </div>
      <h3>Could vs Was able to</h3>
      <p><strong>Could</strong> - общая способность в прошлом<br>
      <strong>Was able to</strong> - удалось в конкретной ситуации:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I could run fast. (вообще мог)</div>
        <div class="en-ex">I was able to catch the bus. (удалось поймать)</div>
      </div>
    `
  },
  {
    id: 'b1_modals_deduction',
    title: "Modal Verbs of Deduction",
    desc: "Must be, might be, can't be.",
    icon: 'fa-search',
    content: `
      <h3>Must - уверенность (95%)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He must be tired. (Он наверняка устал)</div>
        <div class="en-ex">She must be at home. (Она точно дома)</div>
      </div>
      <h3>May/Might - возможность (50%)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He may/might be busy. (Возможно, он занят)</div>
      </div>
      <h3>Can't - невозможно (0%)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It can't be true! (Это не может быть правдой!)</div>
        <div class="en-ex">She can't be 40! (Ей не может быть 40!)</div>
      </div>
      <h3>Could - возможность в вопросах</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Could it be John? (Может, это Джон?)</div>
      </div>
      <h3>С continuous</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He must be working. (Он наверняка работает)</div>
        <div class="en-ex">They can't be sleeping. (Они не могут спать)</div>
      </div>
    `
  },
  {
    id: 'b1_used_to_forms',
    title: "Used to, Be used to, Get used to",
    desc: "Привычки: прошлые и настоящие.",
    icon: 'fa-sync-alt',
    content: `
      <h3>Used to + глагол (раньше делал)</h3>
      <p>Прошлые привычки или состояния:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I used to smoke. (раньше курил, сейчас нет)</div>
        <div class="en-ex">There used to be a cinema here.</div>
      </div>
      <h3>Be used to + -ing/noun (привык к)</h3>
      <p>Привычка в настоящем:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'm used to getting up early. (привык вставать рано)</div>
        <div class="en-ex">He's used to the cold. (привык к холоду)</div>
      </div>
      <h3>Get used to + -ing/noun (привыкаю к)</h3>
      <p>Процесс привыкания:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'm getting used to my new job. (привыкаю к новой работе)</div>
        <div class="en-ex">You'll get used to it. (ты привыкнешь)</div>
      </div>
      <h3>Usually vs Used to</h3>
      <p><strong>Usually</strong> - обычно (в настоящем)<br>
      <strong>Used to</strong> - раньше (в прошлом)</p>
    `
  },
  {
    id: 'b1_had_better',
    title: "Had better, It's time",
    desc: "Настоятельные советы и пора бы.",
    icon: 'fa-exclamation',
    content: `
      <h3>Had better (лучше бы)</h3>
      <p>Сильный совет с оттенком предупреждения:</p>
      <div class="grammar-example-box">
        <div class="en-ex">You'd better hurry up! (Тебе лучше поторопиться!)</div>
        <div class="en-ex">We'd better not be late. (Нам лучше не опаздывать)</div>
      </div>
      <p>⚠️ Несмотря на had, это о настоящем/будущем!</p>
      <h3>It's time + past (пора бы)</h3>
      <p>Используем past, но говорим о настоящем:</p>
      <div class="grammar-example-box">
        <div class="en-ex">It's time we went home. (Пора бы нам идти домой)</div>
        <div class="en-ex">It's time you got a job. (Тебе пора найти работу)</div>
      </div>
      <h3>It's (high) time</h3>
      <p>High усиливает срочность:</p>
      <div class="grammar-example-box">
        <div class="en-ex">It's high time you learned to drive!</div>
      </div>
      <h3>It's time to + infinitive</h3>
      <p>Простое указание на время:</p>
      <div class="grammar-example-box">
        <div class="en-ex">It's time to go. (Пора идти)</div>
      </div>
    `
  },
  {
    id: 'b1_would_rather',
    title: "Would rather & Would sooner",
    desc: "Предпочтения и выбор.",
    icon: 'fa-heart',
    content: `
      <h3>Would rather + глагол (предпочел бы)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'd rather stay home. (Я бы предпочел остаться дома)</div>
        <div class="en-ex">Would you rather tea or coffee? (Ты предпочтешь чай или кофе?)</div>
      </div>
      <h3>Would rather not (предпочел бы не)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'd rather not go out tonight.</div>
      </div>
      <h3>Would rather + someone + past</h3>
      <p>Хочу, чтобы кто-то другой сделал:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'd rather you didn't smoke here.</div>
        <div class="ru-ex">Я бы предпочел, чтобы ты не курил здесь.</div>
      </div>
      <h3>Would rather... than...</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'd rather walk than take a bus.</div>
      </div>
      <h3>Would sooner = Would rather</h3>
      <p>Полные синонимы, sooner более формальный.</p>
    `
  },
  {
    id: 'b1_phrasal_verbs_1',
    title: "Phrasal Verbs Part 1",
    desc: "Основные фразовые глаголы.",
    icon: 'fa-puzzle-piece',
    content: `
      <h3>Everyday Phrasal Verbs</h3>
      <ul>
        <li><strong>wake up</strong> - просыпаться</li>
        <li><strong>get up</strong> - вставать с кровати</li>
        <li><strong>put on</strong> - надевать</li>
        <li><strong>take off</strong> - снимать (одежду)</li>
        <li><strong>go out</strong> - выходить (развлекаться)</li>
        <li><strong>come back</strong> - возвращаться</li>
        <li><strong>sit down</strong> - садиться</li>
        <li><strong>stand up</strong> - вставать</li>
      </ul>
      <h3>Work & Study</h3>
      <ul>
        <li><strong>carry on</strong> - продолжать</li>
        <li><strong>give up</strong> - сдаваться, бросать</li>
        <li><strong>put off</strong> - откладывать</li>
        <li><strong>hand in</strong> - сдавать (работу)</li>
        <li><strong>write down</strong> - записывать</li>
      </ul>
      <h3>Separable vs Inseparable</h3>
      <p><strong>Separable:</strong> Turn off the TV = Turn the TV off</p>
      <p><strong>С местоимением только раздельно:</strong> Turn it off ✓</p>
      <p><strong>Inseparable:</strong> Look after the baby (NOT: look the baby after)</p>
    `
  },
  {
    id: 'b1_phrasal_verbs_2',
    title: "Phrasal Verbs Part 2",
    desc: "Фразовые глаголы: отношения и общение.",
    icon: 'fa-comments',
    content: `
      <h3>Relationships</h3>
      <ul>
        <li><strong>get on (with)</strong> - ладить с</li>
        <li><strong>fall out (with)</strong> - поссориться</li>
        <li><strong>make up</strong> - помириться</li>
        <li><strong>break up</strong> - расстаться</li>
        <li><strong>go out (with)</strong> - встречаться с</li>
        <li><strong>ask out</strong> - пригласить на свидание</li>
        <li><strong>split up</strong> - разойтись</li>
      </ul>
      <h3>Communication</h3>
      <ul>
        <li><strong>call back</strong> - перезвонить</li>
        <li><strong>hang up</strong> - повесить трубку</li>
        <li><strong>pick up</strong> - поднять трубку</li>
        <li><strong>speak up</strong> - говорить громче</li>
        <li><strong>shut up</strong> - замолчать (грубо)</li>
      </ul>
      <h3>Plans & Arrangements</h3>
      <ul>
        <li><strong>call off</strong> - отменить</li>
        <li><strong>put off</strong> - отложить</li>
        <li><strong>set up</strong> - организовать</li>
        <li><strong>turn up</strong> - появиться</li>
      </ul>
    `
  },
  {
    id: 'b1_phrasal_verbs_3',
    title: "Phrasal Verbs Part 3",
    desc: "Фразовые глаголы: движение и транспорт.",
    icon: 'fa-car',
    content: `
      <h3>Transport</h3>
      <ul>
        <li><strong>get in/into</strong> - садиться (в машину)</li>
        <li><strong>get out (of)</strong> - выходить (из машины)</li>
        <li><strong>get on</strong> - садиться (в автобус, поезд)</li>
        <li><strong>get off</strong> - выходить (из автобуса)</li>
        <li><strong>pick up</strong> - забрать (на машине)</li>
        <li><strong>drop off</strong> - высадить</li>
        <li><strong>set off</strong> - отправляться в путь</li>
      </ul>
      <h3>Movement</h3>
      <ul>
        <li><strong>come in</strong> - входить</li>
        <li><strong>go away</strong> - уходить</li>
        <li><strong>come back</strong> - возвращаться</li>
        <li><strong>turn around</strong> - развернуться</li>
        <li><strong>run away</strong> - убегать</li>
      </ul>
      <h3>Looking & Finding</h3>
      <ul>
        <li><strong>look for</strong> - искать</li>
        <li><strong>look after</strong> - присматривать</li>
        <li><strong>look up</strong> - искать информацию</li>
        <li><strong>find out</strong> - узнать, выяснить</li>
        <li><strong>turn out</strong> - оказаться</li>
      </ul>
    `
  },

  // --- CONDITIONALS ---
  {
    id: 'b1_first_conditional',
    title: "First Conditional & Time Clauses",
    desc: "Реальные условия и временные придаточные.",
    icon: 'fa-cloud-sun',
    content: `
      <h3>First Conditional</h3>
      <p><strong>If + Present Simple, will/can/may + глагол</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">If it rains, we'll stay home.</div>
        <div class="en-ex">If you study, you can pass.</div>
      </div>
      <h3>Unless = If not</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Unless you hurry, you'll be late.</div>
        <div class="ru-ex">Если не поторопишься, опоздаешь.</div>
      </div>
      <h3>Time Clauses (временные придаточные)</h3>
      <p>После этих слов НЕ используем will:</p>
      <ul>
        <li><strong>when</strong> - когда</li>
        <li><strong>as soon as</strong> - как только</li>
        <li><strong>before</strong> - перед тем как</li>
        <li><strong>after</strong> - после того как</li>
        <li><strong>until/till</strong> - до тех пор пока</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">I'll call you when I get home.</div>
        <div class="en-ex">Wait here until I come back.</div>
      </div>
      <h3>In case (на случай если)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Take an umbrella in case it rains.</div>
      </div>
    `
  },
  {
    id: 'b1_second_conditional',
    title: "Second Conditional",
    desc: "Нереальные и воображаемые ситуации.",
    icon: 'fa-magic',
    content: `
      <h3>Формула</h3>
      <p><strong>If + Past Simple, would/could/might + глагол</strong></p>
      <h3>Нереальные ситуации сейчас</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If I had money, I would travel.</div>
        <div class="ru-ex">Если бы у меня были деньги, я бы путешествовал.</div>
      </div>
      <h3>Советы (If I were you)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If I were you, I'd accept the offer.</div>
        <div class="ru-ex">На твоем месте я бы принял предложение.</div>
      </div>
      <p>⚠️ Используем were для всех лиц (формально правильно)</p>
      <h3>Could/Might для меньшей вероятности</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If I won the lottery, I could buy a yacht.</div>
        <div class="en-ex">If he studied harder, he might pass.</div>
      </div>
      <h3>Мечты и желания</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If only I could fly!</div>
        <div class="en-ex">I wish I had more time.</div>
      </div>
    `
  },
  {
    id: 'b1_mixed_conditionals',
    title: "First & Second Conditionals",
    desc: "Выбор между реальным и нереальным.",
    icon: 'fa-code-branch',
    content: `
      <h3>First - реально может случиться</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If it rains tomorrow, I'll stay home.</div>
        <div class="ru-ex">(вполне может пойти дождь)</div>
      </div>
      <h3>Second - маловероятно или невозможно</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If it rained in the Sahara, tourists would be surprised.</div>
        <div class="ru-ex">(очень маловероятно)</div>
      </div>
      <h3>Сравнение</h3>
      <p><strong>First:</strong> If I have time, I'll help you. (может быть будет время)<br>
      <strong>Second:</strong> If I had time, I'd help you. (но времени нет)</p>
      <h3>Вежливость через Second Conditional</h3>
      <p>Second Conditional звучит более вежливо и менее прямолинейно:</p>
      <div class="grammar-example-box">
        <div class="en-ex">It would be nice if you helped me.</div>
        <div class="ru-ex">Было бы хорошо, если бы ты помог.</div>
      </div>
    `
  },
  {
    id: 'b1_third_conditional',
    title: "Third Conditional",
    desc: "Сожаления о прошлом.",
    icon: 'fa-undo',
    content: `
      <h3>Формула</h3>
      <p><strong>If + Past Perfect, would have + V3</strong></p>
      <h3>Нереальное прошлое</h3>
      <p>Говорим о том, что НЕ произошло в прошлом:</p>
      <div class="grammar-example-box">
        <div class="en-ex">If I had studied, I would have passed.</div>
        <div class="ru-ex">Если бы я учился, я бы сдал (но не учился и не сдал).</div>
      </div>
      <h3>Сожаления</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If I had known, I would have helped you.</div>
        <div class="ru-ex">Если бы я знал, я бы помог тебе.</div>
      </div>
      <h3>Could have / Might have</h3>
      <p>Для выражения возможности в прошлом:</p>
      <div class="grammar-example-box">
        <div class="en-ex">If you had asked, I could have helped.</div>
        <div class="en-ex">If it had been sunny, we might have gone to the beach.</div>
      </div>
      <h3>Критика прошлых действий</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If you had listened to me, this wouldn't have happened.</div>
      </div>
    `
  },

  // --- PASSIVE ---
  {
    id: 'b1_passive_forms',
    title: "Passive Voice - All Forms",
    desc: "Страдательный залог во всех временах.",
    icon: 'fa-exchange-alt',
    content: `
      <h3>Основная формула</h3>
      <p><strong>Be + Past Participle (V3)</strong></p>
      <h3>Времена в Passive</h3>
      <ul>
        <li><strong>Present Simple:</strong> is/are done</li>
        <li><strong>Present Continuous:</strong> is/are being done</li>
        <li><strong>Present Perfect:</strong> has/have been done</li>
        <li><strong>Past Simple:</strong> was/were done</li>
        <li><strong>Past Continuous:</strong> was/were being done</li>
        <li><strong>Past Perfect:</strong> had been done</li>
        <li><strong>Future:</strong> will be done</li>
        <li><strong>Modal:</strong> can/must/should be done</li>
      </ul>
      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The letter is written every day.</div>
        <div class="en-ex">The letter is being written now.</div>
        <div class="en-ex">The letter has been written.</div>
        <div class="en-ex">The letter will be written tomorrow.</div>
      </div>
      <h3>By + agent (кем?)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The book was written by Dickens.</div>
      </div>
      <p>Agent часто опускается, если не важен или очевиден.</p>
    `
  },
  {
    id: 'b1_passive_usage',
    title: "Active vs Passive Voice",
    desc: "Когда использовать страдательный залог.",
    icon: 'fa-balance-scale',
    content: `
      <h3>Когда используем Passive</h3>
      <p>1. <strong>Действие важнее деятеля:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">My car was stolen. (кто украл - не знаем/не важно)</div>
      </div>
      <p>2. <strong>Очевидный или неизвестный деятель:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">Coffee is grown in Brazil. (очевидно - фермерами)</div>
      </div>
      <p>3. <strong>Формальный/научный стиль:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">The experiment was conducted carefully.</div>
      </div>
      <h3>Преобразование Active → Passive</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Active: They built this house in 1990.</div>
        <div class="en-ex">Passive: This house was built in 1990.</div>
      </div>
      <h3>Get passive (разговорный)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I got fired. = I was fired.</div>
        <div class="en-ex">He got promoted. = He was promoted.</div>
      </div>
    `
  },

  // --- REPORTED SPEECH ---
  {
    id: 'b1_reported_speech',
    title: "Reported Speech",
    desc: "Косвенная речь - все правила.",
    icon: 'fa-quote-right',
    content: `
      <h3>Изменение времен</h3>
      <ul>
        <li>Present Simple → Past Simple</li>
        <li>Present Continuous → Past Continuous</li>
        <li>Present Perfect → Past Perfect</li>
        <li>Past Simple → Past Perfect</li>
        <li>Will → Would</li>
        <li>Can → Could</li>
        <li>Must → Had to</li>
      </ul>
      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">"I work here" → He said he worked there.</div>
        <div class="en-ex">"I'm working" → He said he was working.</div>
        <div class="en-ex">"I'll help" → He said he would help.</div>
      </div>
      <h3>Указатели времени и места</h3>
      <ul>
        <li>today → that day</li>
        <li>tomorrow → the next day</li>
        <li>yesterday → the day before</li>
        <li>here → there</li>
        <li>this → that</li>
        <li>now → then</li>
      </ul>
      <h3>Вопросы в косвенной речи</h3>
      <div class="grammar-example-box">
        <div class="en-ex">"Where do you live?" → He asked where I lived.</div>
        <div class="en-ex">"Do you smoke?" → He asked if I smoked.</div>
      </div>
    `
  },

  // --- GERUND & INFINITIVE ---
  {
    id: 'b1_gerund_infinitive',
    title: "Gerund or Infinitive",
    desc: "Глагол + -ing или to?",
    icon: 'fa-code-branch',
    content: `
      <h3>Verb + Infinitive (to do)</h3>
      <ul>
        <li>agree, decide, hope, learn, offer</li>
        <li>plan, promise, refuse, want, would like</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">I decided to leave early.</div>
      </div>
      <h3>Verb + Gerund (-ing)</h3>
      <ul>
        <li>avoid, enjoy, finish, imagine, keep</li>
        <li>mind, miss, suggest, can't stand</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">I enjoy reading books.</div>
      </div>
      <h3>Verb + Both (смысл одинаковый)</h3>
      <ul>
        <li>begin, continue, hate, like, love, prefer, start</li>
      </ul>
      <h3>Verb + Both (смысл разный)</h3>
      <p><strong>Remember:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">Remember to call (не забудь позвонить)</div>
        <div class="en-ex">Remember calling (помню, как звонил)</div>
      </div>
      <p><strong>Stop:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">Stop smoking (бросить курить)</div>
        <div class="en-ex">Stop to smoke (остановиться, чтобы покурить)</div>
      </div>
      <p><strong>Try:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">Try to open (попытаться открыть)</div>
        <div class="en-ex">Try opening (попробовать открыть - как метод)</div>
      </div>
    `
  },

  // --- ARTICLES & DETERMINERS ---
  {
    id: 'b1_articles',
    title: "Articles: A, The, Zero",
    desc: "Артикли - продвинутый уровень.",
    icon: 'fa-font',
    content: `
      <h3>A/An - первое упоминание</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I saw a man. The man was tall.</div>
      </div>
      <h3>The - конкретный/единственный</h3>
      <ul>
        <li>The sun, the moon (единственные)</li>
        <li>The biggest, the first (превосходная степень)</li>
        <li>The cinema, the theatre (место как институция)</li>
        <li>The USA, the UK (страны с Kingdom, States)</li>
      </ul>
      <h3>Zero article (без артикля)</h3>
      <ul>
        <li>Обобщения: Dogs are loyal (собаки вообще)</li>
        <li>Абстракции: Love is important</li>
        <li>Места по назначению: go to work/school/bed</li>
        <li>Приемы пищи: have breakfast/lunch</li>
        <li>Большинство стран: France, Japan</li>
      </ul>
      <h3>Особые случаи</h3>
      <div class="grammar-example-box">
        <div class="en-ex">in the morning BUT at night</div>
        <div class="en-ex">play the piano BUT play football</div>
      </div>
    `
  },
  {
    id: 'b1_reflexive',
    title: "Reflexive Pronouns",
    desc: "Возвратные местоимения: myself, yourself.",
    icon: 'fa-redo',
    content: `
      <h3>Формы</h3>
      <ul>
        <li>I → myself</li>
        <li>you → yourself/yourselves</li>
        <li>he → himself</li>
        <li>she → herself</li>
        <li>it → itself</li>
        <li>we → ourselves</li>
        <li>they → themselves</li>
      </ul>
      <h3>Использование</h3>
      <p>1. <strong>Когда subject = object:</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">I hurt myself. (Я поранился)</div>
        <div class="en-ex">She taught herself Spanish.</div>
      </div>
      <p>2. <strong>Для усиления (сам):</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">I did it myself. (Я сделал это сам)</div>
        <div class="en-ex">The president himself called me.</div>
      </div>
      <h3>By + reflexive = в одиночку</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I live by myself. (Я живу один)</div>
      </div>
      <h3>НЕ используем после:</h3>
      <p>wash, shave, dress, feel (обычно)</p>
      <div class="grammar-example-box">
        <div class="en-ex">I washed and dressed. (NOT: myself)</div>
      </div>
    `
  },
  {
    id: 'b1_quantifiers',
    title: "Quantifiers: All, Both, Neither",
    desc: "Квантификаторы для групп.",
    icon: 'fa-layer-group',
    content: `
      <h3>All (все)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">All students passed. (все студенты)</div>
        <div class="en-ex">All of my friends came.</div>
      </div>
      <h3>Both (оба - для двух)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Both answers are correct.</div>
        <div class="en-ex">I like both of them.</div>
      </div>
      <h3>Either (любой из двух)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You can take either book.</div>
        <div class="en-ex">Either way is fine.</div>
      </div>
      <h3>Neither (ни один из двух)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Neither answer is correct.</div>
        <div class="en-ex">Neither of us knew.</div>
      </div>
      <h3>None (никто/ничто из многих)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">None of the students came.</div>
      </div>
      <h3>Both...and / Either...or / Neither...nor</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Both Tom and Jerry came.</div>
        <div class="en-ex">Either call or text me.</div>
        <div class="en-ex">Neither John nor Mary knew.</div>
      </div>
    `
  },
  {
    id: 'b1_another_other',
    title: "Another, Other, Others",
    desc: "Другой, другие - все формы.",
    icon: 'fa-random',
    content: `
      <h3>Another + singular (еще один)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Can I have another coffee?</div>
        <div class="ru-ex">Можно еще один кофе?</div>
      </div>
      <h3>Other + plural (другие)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Other people might disagree.</div>
        <div class="ru-ex">Другие люди могут не согласиться.</div>
      </div>
      <h3>The other (конкретный другой)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">One shoe is here. Where's the other?</div>
        <div class="ru-ex">Один ботинок здесь. Где другой?</div>
      </div>
      <h3>Others = other + noun</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Some like tea, others prefer coffee.</div>
      </div>
      <h3>The others (остальные)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Two students left. The others stayed.</div>
      </div>
      <h3>Each other / One another</h3>
      <div class="grammar-example-box">
        <div class="en-ex">They love each other. (друг друга)</div>
      </div>
    `
  },

  // --- RELATIVE CLAUSES ---
  {
    id: 'b1_relative_clauses',
    title: "Defining & Non-defining Clauses",
    desc: "Определительные придаточные предложения.",
    icon: 'fa-link',
    content: `
      <h3>Defining (определяющие) - без запятых</h3>
      <p>Необходимая информация, без которой непонятно, о чем речь:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The man who called you is here.</div>
        <div class="ru-ex">Человек, который тебе звонил, здесь.</div>
      </div>
      <h3>Non-defining (неопределяющие) - с запятыми</h3>
      <p>Дополнительная информация, можно убрать:</p>
      <div class="grammar-example-box">
        <div class="en-ex">My brother, who lives in London, is a doctor.</div>
        <div class="ru-ex">Мой брат, который живет в Лондоне, - доктор.</div>
      </div>
      <h3>That - только в defining</h3>
      <div class="grammar-example-box">
        <div class="en-ex">✓ The book that/which I bought</div>
        <div class="en-ex">❌ My car, that is red, ... (нужно which)</div>
      </div>
      <h3>Whose (чей)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The girl whose father is a pilot.</div>
      </div>
      <h3>Опускаем who/which/that когда это object</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The book (which) I bought.</div>
        <div class="en-ex">The man (who) you met.</div>
      </div>
    `
  },

  // --- AUXILIARY VERBS ---
  {
    id: 'b1_question_tags',
    title: "Question Tags",
    desc: "Разделительные вопросы: не так ли?",
    icon: 'fa-question',
    content: `
      <h3>Основное правило</h3>
      <p>Положительное → отрицательный tag<br>
      Отрицательное → положительный tag</p>
      <h3>Примеры с разными временами</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You are tired, aren't you?</div>
        <div class="en-ex">She isn't coming, is she?</div>
        <div class="en-ex">They work here, don't they?</div>
        <div class="en-ex">He didn't call, did he?</div>
        <div class="en-ex">You can swim, can't you?</div>
      </div>
      <h3>Особые случаи</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I am right, aren't I? (NOT: amn't I?)</div>
        <div class="en-ex">Let's go, shall we?</div>
        <div class="en-ex">Don't be late, will you?</div>
      </div>
      <h3>Интонация</h3>
      <p>↘ падающая - уверенность (подтверждение)<br>
      ↗ растущая - настоящий вопрос</p>
    `
  },

  // --- ADJECTIVES & ADVERBS ---
  {
    id: 'b1_comparatives_adverbs',
    title: "Comparatives & Superlatives",
    desc: "Сравнения: прилагательные и наречия.",
    icon: 'fa-sort',
    content: `
      <h3>Усиление сравнительной степени</h3>
      <ul>
        <li><strong>much/far</strong> better (намного лучше)</li>
        <li><strong>a bit/a little</strong> better (немного лучше)</li>
        <li><strong>even</strong> better (еще лучше)</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">This is much more expensive.</div>
        <div class="en-ex">She's a bit taller than me.</div>
      </div>
      <h3>The + comparative, the + comparative</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The more you practice, the better you get.</div>
        <div class="ru-ex">Чем больше практикуешься, тем лучше становишься.</div>
      </div>
      <h3>Less и least (менее)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">less interesting, the least interesting</div>
      </div>
      <h3>Сравнение наречий</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He runs faster than me.</div>
        <div class="en-ex">She works more carefully.</div>
      </div>
    `
  },
  {
    id: 'b1_ed_ing_adjectives',
    title: "-ED vs -ING Adjectives",
    desc: "Прилагательные от глаголов.",
    icon: 'fa-theater-masks',
    content: `
      <h3>-ED - чувство (как себя чувствую)</h3>
      <p>Описывает чувства человека:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'm bored. (Мне скучно)</div>
        <div class="en-ex">She's interested. (Ей интересно)</div>
        <div class="en-ex">We're tired. (Мы устали)</div>
      </div>
      <h3>-ING - причина (что вызывает чувство)</h3>
      <p>Описывает то, что вызывает чувство:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The film is boring. (Фильм скучный)</div>
        <div class="en-ex">The book is interesting. (Книга интересная)</div>
        <div class="en-ex">The job is tiring. (Работа утомительная)</div>
      </div>
      <h3>Популярные пары</h3>
      <ul>
        <li>bored/boring</li>
        <li>interested/interesting</li>
        <li>excited/exciting</li>
        <li>tired/tiring</li>
        <li>surprised/surprising</li>
        <li>disappointed/disappointing</li>
        <li>confused/confusing</li>
      </ul>
    `
  },
  {
    id: 'b1_so_such',
    title: "So, Such, Such a",
    desc: "Такой, так - усиление.",
    icon: 'fa-exclamation',
    content: `
      <h3>So + adjective/adverb</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She's so beautiful!</div>
        <div class="en-ex">He runs so fast!</div>
      </div>
      <h3>Such + (adjective) + noun</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She's such a beautiful girl!</div>
        <div class="en-ex">It was such nice weather!</div>
      </div>
      <h3>Such a + singular countable</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It's such a nice day!</div>
      </div>
      <h3>So much/many vs Such a lot of</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I have so much work!</div>
        <div class="en-ex">There were so many people!</div>
        <div class="en-ex">I have such a lot of work!</div>
      </div>
      <h3>So...that / Such...that (результат)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It was so cold that we stayed in.</div>
        <div class="en-ex">It was such a cold day that we stayed in.</div>
      </div>
    `
  },
  {
    id: 'b1_compound_adjectives',
    title: "Compound Adjectives",
    desc: "Составные прилагательные.",
    icon: 'fa-link',
    content: `
      <h3>Number + noun (всегда singular)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">a five-minute break (NOT: five-minutes)</div>
        <div class="en-ex">a ten-year-old boy</div>
        <div class="en-ex">a three-hour journey</div>
      </div>
      <h3>Adjective + noun-ed</h3>
      <div class="grammar-example-box">
        <div class="en-ex">blue-eyed (голубоглазый)</div>
        <div class="en-ex">long-haired (длинноволосый)</div>
        <div class="en-ex">left-handed (левша)</div>
      </div>
      <h3>Adjective/Adverb + past participle</h3>
      <div class="grammar-example-box">
        <div class="en-ex">well-known (известный)</div>
        <div class="en-ex">well-paid (хорошо оплачиваемый)</div>
        <div class="en-ex">brightly-lit (ярко освещенный)</div>
      </div>
      <h3>Noun + adjective</h3>
      <div class="grammar-example-box">
        <div class="en-ex">world-famous (всемирно известный)</div>
        <div class="en-ex">ice-cold (ледяной)</div>
      </div>
    `
  },

  // --- CONJUNCTIONS ---
  {
    id: 'b1_clauses',
    title: "Clauses of Contrast, Purpose, Reason",
    desc: "Придаточные предложения разных типов.",
    icon: 'fa-sitemap',
    content: `
      <h3>Contrast (контраст)</h3>
      <ul>
        <li><strong>although/though</strong> + clause: Although it rained, we went out.</li>
        <li><strong>despite/in spite of</strong> + noun/-ing: Despite the rain, we went out.</li>
        <li><strong>however</strong> (начало предложения): It rained. However, we went out.</li>
      </ul>
      <h3>Purpose (цель)</h3>
      <ul>
        <li><strong>to/in order to/so as to</strong> + infinitive: I study to pass exams.</li>
        <li><strong>so that</strong> + clause: I study so that I can pass.</li>
        <li><strong>for</strong> + noun/-ing: This is for cutting bread.</li>
      </ul>
      <h3>Reason (причина)</h3>
      <ul>
        <li><strong>because</strong> + clause: I stayed home because I was ill.</li>
        <li><strong>because of</strong> + noun/-ing: I stayed home because of illness.</li>
        <li><strong>as/since</strong> + clause: As it was late, we left.</li>
      </ul>
      <h3>Result (результат)</h3>
      <ul>
        <li><strong>so</strong>: I was tired, so I went to bed.</li>
        <li><strong>so...that</strong>: It was so hot that we couldn't sleep.</li>
      </ul>
    `
  },

  // --- PREPOSITIONS ---
  {
    id: 'b1_verb_prepositions',
    title: "Verb + Preposition",
    desc: "Глаголы с предлогами.",
    icon: 'fa-plug',
    content: `
      <h3>Common Verb + Preposition</h3>
      <ul>
        <li><strong>agree with</strong> someone / <strong>agree on</strong> something</li>
        <li><strong>apologize for</strong> something / <strong>apologize to</strong> someone</li>
        <li><strong>apply for</strong> a job</li>
        <li><strong>believe in</strong> something</li>
        <li><strong>belong to</strong> someone</li>
        <li><strong>depend on</strong> something</li>
        <li><strong>dream about/of</strong> something</li>
        <li><strong>listen to</strong> someone/something</li>
        <li><strong>look after</strong> someone</li>
        <li><strong>look for</strong> something</li>
        <li><strong>pay for</strong> something</li>
        <li><strong>think about/of</strong> something</li>
        <li><strong>wait for</strong> someone/something</li>
        <li><strong>worry about</strong> something</li>
      </ul>
      <h3>Different meanings</h3>
      <div class="grammar-example-box">
        <div class="en-ex">look at (смотреть на)</div>
        <div class="en-ex">look for (искать)</div>
        <div class="en-ex">look after (заботиться)</div>
      </div>
    `
  },
  {
    id: 'b1_adj_prepositions',
    title: "Adjective + Preposition",
    desc: "Прилагательные с предлогами.",
    icon: 'fa-link',
    content: `
      <h3>Common Adjective + Preposition</h3>
      <ul>
        <li><strong>afraid of</strong> spiders</li>
        <li><strong>angry with</strong> someone / <strong>about</strong> something</li>
        <li><strong>bad/good at</strong> something</li>
        <li><strong>bored with</strong> something</li>
        <li><strong>different from</strong> something</li>
        <li><strong>excited about</strong> something</li>
        <li><strong>famous for</strong> something</li>
        <li><strong>interested in</strong> something</li>
        <li><strong>keen on</strong> something</li>
        <li><strong>proud of</strong> something</li>
        <li><strong>similar to</strong> something</li>
        <li><strong>tired of</strong> something</li>
        <li><strong>worried about</strong> something</li>
      </ul>
      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'm good at math but bad at languages.</div>
        <div class="en-ex">She's interested in art.</div>
        <div class="en-ex">He's afraid of flying.</div>
      </div>
    `
  },
  {
    id: 'b1_time_prepositions',
    title: "During, For, While",
    desc: "Предлоги времени - различия.",
    icon: 'fa-clock',
    content: `
      <h3>During + noun (во время)</h3>
      <p>Когда что-то происходит:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I fell asleep during the film.</div>
        <div class="ru-ex">Я заснул во время фильма.</div>
      </div>
      <h3>For + period (в течение)</h3>
      <p>Как долго что-то длится:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I slept for 8 hours.</div>
        <div class="ru-ex">Я спал 8 часов.</div>
      </div>
      <h3>While + clause (пока)</h3>
      <p>Во время действия (с глаголом):</p>
      <div class="grammar-example-box">
        <div class="en-ex">I fell asleep while I was watching the film.</div>
        <div class="ru-ex">Я заснул, пока смотрел фильм.</div>
      </div>
      <h3>Сравнение</h3>
      <div class="grammar-example-box">
        <div class="en-ex">during the summer (noun)</div>
        <div class="en-ex">for two months (period)</div>
        <div class="en-ex">while we were on holiday (clause)</div>
      </div>
    `
  },
  {
    id: 'b1_for_since',
    title: "For, Since, From",
    desc: "Предлоги времени с Perfect.",
    icon: 'fa-hourglass-half',
    content: `
      <h3>For - период (как долго)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I've lived here for 5 years.</div>
        <div class="en-ex">She studied for 3 hours.</div>
      </div>
      <h3>Since - точка начала (с какого момента)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I've lived here since 2019.</div>
        <div class="en-ex">She's been waiting since 3 o'clock.</div>
      </div>
      <h3>From...to/till/until</h3>
      <p>Начало и конец периода:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The shop is open from 9 to 6.</div>
        <div class="en-ex">I worked from morning till night.</div>
      </div>
      <h3>Ago - назад</h3>
      <p>С Past Simple, не с Perfect:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I started 5 years ago. (NOT: for 5 years ago)</div>
      </div>
    `
  }
],

      "B2": [
  // --- NARRATIVE TENSES ---
  {
    id: 'b2_narrative_tenses',
    title: "Narrative Tenses",
    desc: "Времена для рассказов и историй.",
    icon: 'fa-book-open',
    content: `
      <h3>Комбинирование времен в повествовании</h3>
      <p><strong>Past Simple</strong> - основные события (что произошло)<br>
      <strong>Past Continuous</strong> - фон, описание обстановки<br>
      <strong>Past Perfect</strong> - предшествующие события<br>
      <strong>Past Perfect Continuous</strong> - длительность до момента</p>
      
      <h3>Типичная структура истории</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I was walking home (фон) when I realized (событие) that I had forgotten (предшествующее) my keys. I had been thinking (длительность до) about work all day, so I wasn't paying attention.</div>
      </div>
      
      <h3>Would и Used to в рассказах</h3>
      <p><strong>Used to</strong> - состояния и привычки в прошлом:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I used to live in Paris. (жил раньше)</div>
      </div>
      <p><strong>Would</strong> - только повторяющиеся действия (не состояния):</p>
      <div class="grammar-example-box">
        <div class="en-ex">Every summer we would go to the beach.</div>
        <div class="en-ex">❌ I would live in Paris. (неверно - состояние)</div>
      </div>
      
      <h3>Sequencing words</h3>
      <ul>
        <li>First / At first / Initially</li>
        <li>Then / After that / Subsequently</li>
        <li>Meanwhile / In the meantime</li>
        <li>Eventually / Finally / In the end</li>
      </ul>
    `
  },

  // --- FUTURE FORMS ---
  {
    id: 'b2_future_perfect_continuous',
    title: "Future Perfect & Continuous",
    desc: "Сложные формы будущего времени.",
    icon: 'fa-hourglass-end',
    content: `
      <h3>Future Continuous</h3>
      <p><strong>Will be + V-ing</strong> - процесс в определенный момент будущего:</p>
      <div class="grammar-example-box">
        <div class="en-ex">This time tomorrow I'll be flying to Paris.</div>
        <div class="ru-ex">Завтра в это время я буду лететь в Париж.</div>
      </div>
      <p>Также для вежливых вопросов о планах:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Will you be using the car tonight?</div>
      </div>
      
      <h3>Future Perfect</h3>
      <p><strong>Will have + V3</strong> - завершенное действие к моменту в будущем:</p>
      <div class="grammar-example-box">
        <div class="en-ex">By 6 PM, I will have finished the report.</div>
        <div class="ru-ex">К 6 вечера я закончу отчет.</div>
      </div>
      
      <h3>Future Perfect Continuous</h3>
      <p><strong>Will have been + V-ing</strong> - длительность к моменту:</p>
      <div class="grammar-example-box">
        <div class="en-ex">By June, I'll have been working here for 10 years.</div>
        <div class="ru-ex">К июню будет 10 лет, как я здесь работаю.</div>
      </div>
      
      <h3>Time markers</h3>
      <ul>
        <li>by (the time) - к моменту</li>
        <li>by then - к тому времени</li>
        <li>in two years' time - через два года</li>
      </ul>
    `
  },
  {
    id: 'b2_future_expressions',
    title: "Other Future Expressions",
    desc: "Альтернативные способы выражения будущего.",
    icon: 'fa-rocket',
    content: `
      <h3>Be about to + infinitive</h3>
      <p>Вот-вот произойдет (очень скоро):</p>
      <div class="grammar-example-box">
        <div class="en-ex">The train is about to leave.</div>
        <div class="ru-ex">Поезд вот-вот отправится.</div>
      </div>
      
      <h3>Be due to + infinitive</h3>
      <p>Запланировано/ожидается (официально):</p>
      <div class="grammar-example-box">
        <div class="en-ex">The flight is due to arrive at 3 PM.</div>
        <div class="ru-ex">Рейс должен прибыть в 3 часа.</div>
      </div>
      
      <h3>Be on the point of + -ing</h3>
      <p>На грани того, чтобы:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'm on the point of giving up.</div>
      </div>
      
      <h3>Be to + infinitive</h3>
      <p>Официальные планы, инструкции:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The president is to visit next week.</div>
      </div>
      
      <h3>Be bound/likely/unlikely to</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He's bound to be late. (обязательно опоздает)</div>
        <div class="en-ex">It's likely to rain. (вероятно, пойдет дождь)</div>
      </div>
    `
  },
  {
    id: 'b2_future_in_past',
    title: "Future in the Past",
    desc: "Будущее с точки зрения прошлого.",
    icon: 'fa-history',
    content: `
      <h3>Что это?</h3>
      <p>Когда рассказываем о прошлых планах на будущее:</p>
      
      <h3>Would вместо Will</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I knew he would be late.</div>
        <div class="ru-ex">Я знал, что он опоздает.</div>
      </div>
      
      <h3>Was/Were going to</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She said she was going to call me.</div>
        <div class="ru-ex">Она сказала, что позвонит мне.</div>
      </div>
      
      <h3>Was/Were to</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The meeting was to start at 3.</div>
        <div class="ru-ex">Встреча должна была начаться в 3.</div>
      </div>
      
      <h3>Was/Were about to</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I was about to leave when he called.</div>
        <div class="ru-ex">Я собирался уходить, когда он позвонил.</div>
      </div>
    `
  },

  // --- MODALS ADVANCED ---
  {
    id: 'b2_modals_past',
    title: "Past Modal Verbs",
    desc: "Модальные глаголы о прошлом.",
    icon: 'fa-history',
    content: `
      <h3>Must have + V3 (уверенность)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He must have forgotten.</div>
        <div class="ru-ex">Он, должно быть, забыл.</div>
      </div>
      
      <h3>May/Might have + V3 (возможность)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She might have been busy.</div>
        <div class="ru-ex">Возможно, она была занята.</div>
      </div>
      
      <h3>Can't/Couldn't have + V3 (невозможность)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He can't have done it!</div>
        <div class="ru-ex">Он не мог этого сделать!</div>
      </div>
      
      <h3>Should have + V3 (критика/сожаление)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You should have told me.</div>
        <div class="ru-ex">Тебе следовало сказать мне.</div>
      </div>
      
      <h3>Could have + V3 (упущенная возможность)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I could have helped, but you didn't ask.</div>
        <div class="ru-ex">Я мог бы помочь, но ты не попросил.</div>
      </div>
      
      <h3>Needn't have + V3 (зря сделал)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You needn't have bought it.</div>
        <div class="ru-ex">Тебе не нужно было это покупать (но купил).</div>
      </div>
    `
  },
  {
    id: 'b2_neednt',
    title: "Need: все формы",
    desc: "Needn't, don't need to, didn't need to.",
    icon: 'fa-check-square',
    content: `
      <h3>Don't need to = Needn't (не нужно)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You don't need to hurry. = You needn't hurry.</div>
        <div class="ru-ex">Тебе не нужно спешить.</div>
      </div>
      
      <h3>Didn't need to (не было необходимости)</h3>
      <p>Не было необходимости (и возможно не делал):</p>
      <div class="grammar-example-box">
        <div class="en-ex">I didn't need to work yesterday.</div>
        <div class="ru-ex">Мне не нужно было работать вчера.</div>
      </div>
      
      <h3>Needn't have done (зря сделал)</h3>
      <p>Не было необходимости, но сделал:</p>
      <div class="grammar-example-box">
        <div class="en-ex">You needn't have cooked - we're eating out!</div>
        <div class="ru-ex">Тебе не нужно было готовить - мы идем в ресторан!</div>
      </div>
      
      <h3>Сравнение</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I didn't need to buy milk. (не покупал или покупал - не ясно)</div>
        <div class="en-ex">I needn't have bought milk. (купил зря - уже было)</div>
      </div>
    `
  },
  {
    id: 'b2_probability',
    title: "Expressing Probability",
    desc: "Вероятность: likely, bound, definitely.",
    icon: 'fa-percentage',
    content: `
      <h3>Definitely/Certainly (100%)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He'll definitely come.</div>
        <div class="en-ex">She's certainly right.</div>
      </div>
      
      <h3>Probably/Likely (70-80%)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It'll probably rain.</div>
        <div class="en-ex">She's likely to agree.</div>
      </div>
      
      <h3>May/Might/Could (50%)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It may/might/could be true.</div>
      </div>
      
      <h3>Unlikely (30%)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It's unlikely to happen.</div>
        <div class="en-ex">He's unlikely to come.</div>
      </div>
      
      <h3>Bound to (обязательно случится)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He's bound to find out sooner or later.</div>
        <div class="ru-ex">Он обязательно узнает рано или поздно.</div>
      </div>
      
      <h3>Due to (должен по плану)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The train is due to arrive at 3.</div>
      </div>
    `
  },
  {
    id: 'b2_verbs_senses',
    title: "Verbs of the Senses",
    desc: "Глаголы чувств: look, sound, feel.",
    icon: 'fa-eye',
    content: `
      <h3>Verb + adjective (не adverb!)</h3>
      <ul>
        <li><strong>look</strong> - выглядеть</li>
        <li><strong>sound</strong> - звучать</li>
        <li><strong>smell</strong> - пахнуть</li>
        <li><strong>taste</strong> - быть на вкус</li>
        <li><strong>feel</strong> - чувствовать себя / на ощупь</li>
      </ul>
      
      <div class="grammar-example-box">
        <div class="en-ex">You look tired. (NOT: tiredly)</div>
        <div class="en-ex">That sounds interesting.</div>
        <div class="en-ex">The food smells delicious.</div>
        <div class="en-ex">This tastes sweet.</div>
        <div class="en-ex">I feel good.</div>
      </div>
      
      <h3>Look like / Sound like + noun</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You look like your mother.</div>
        <div class="en-ex">It sounds like thunder.</div>
      </div>
      
      <h3>Look as if / as though + clause</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You look as if you haven't slept.</div>
        <div class="en-ex">It sounds as though it's raining.</div>
      </div>
      
      <h3>Appear / Seem (казаться)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She appears/seems tired.</div>
        <div class="en-ex">It appears/seems that he's right.</div>
      </div>
    `
  },

  // --- CONDITIONALS ADVANCED ---
  {
    id: 'b2_mixed_conditionals',
    title: "Mixed Conditionals",
    desc: "Смешанные условные предложения.",
    icon: 'fa-blender',
    content: `
      <h3>Type 1: Past → Present</h3>
      <p>Прошлое условие влияет на настоящее:</p>
      <div class="grammar-example-box">
        <div class="en-ex">If I had studied medicine, I would be a doctor now.</div>
        <div class="ru-ex">Если бы я изучал медицину (тогда), я был бы доктором (сейчас).</div>
      </div>
      
      <h3>Type 2: Present → Past</h3>
      <p>Постоянное условие влияет на прошлое:</p>
      <div class="grammar-example-box">
        <div class="en-ex">If I were braver, I would have asked her out.</div>
        <div class="ru-ex">Если бы я был смелее (вообще), я бы пригласил ее (тогда).</div>
      </div>
      
      <h3>Type 3: Past → Future</h3>
      <p>Прошлое условие влияет на будущее:</p>
      <div class="grammar-example-box">
        <div class="en-ex">If I had saved money, I would be going on vacation next week.</div>
        <div class="ru-ex">Если бы я копил деньги, я бы поехал в отпуск на следующей неделе.</div>
      </div>
      
      <h3>Общий принцип</h3>
      <p>Выбираем время в каждой части независимо, основываясь на времени действия.</p>
    `
  },
  {
    id: 'b2_conditional_alternatives',
    title: "Alternatives to IF",
    desc: "Альтернативы IF в условных предложениях.",
    icon: 'fa-exchange-alt',
    content: `
      <h3>Unless (если не)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Unless you hurry, you'll be late.</div>
        <div class="ru-ex">Если не поторопишься, опоздаешь.</div>
      </div>
      
      <h3>Provided/Providing (that) (при условии что)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'll go provided (that) you come too.</div>
      </div>
      
      <h3>As long as / So long as (пока, если)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You can stay as long as you're quiet.</div>
      </div>
      
      <h3>On condition that (при условии)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'll lend you money on condition that you pay me back.</div>
      </div>
      
      <h3>Even if (даже если)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Even if it rains, we'll go.</div>
      </div>
      
      <h3>Supposing/Suppose (предположим)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Supposing you won the lottery, what would you do?</div>
      </div>
      
      <h3>In case (на случай если)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Take an umbrella in case it rains.</div>
      </div>
    `
  },
  {
    id: 'b2_wishes_regrets',
    title: "Wishes and Regrets",
    desc: "Желания и сожаления: I wish, If only.",
    icon: 'fa-star',
    content: `
      <h3>Present wishes (нереальное настоящее)</h3>
      <p><strong>Wish + Past Simple/Continuous</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">I wish I were taller. (Жаль, что я не выше)</div>
        <div class="en-ex">I wish I had more money.</div>
        <div class="en-ex">I wish it wasn't raining.</div>
      </div>
      
      <h3>Past regrets (сожаления о прошлом)</h3>
      <p><strong>Wish + Past Perfect</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">I wish I had studied harder.</div>
        <div class="ru-ex">Жаль, что я не учился усерднее.</div>
      </div>
      
      <h3>Future wishes (маловероятное будущее)</h3>
      <p><strong>Wish + would</strong> (часто раздражение)</p>
      <div class="grammar-example-box">
        <div class="en-ex">I wish he would stop smoking.</div>
        <div class="en-ex">I wish it would stop raining.</div>
      </div>
      
      <h3>If only (более эмоционально)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If only I knew the answer!</div>
        <div class="en-ex">If only I hadn't said that!</div>
      </div>
      
      <h3>Would rather + past (предпочтения о других)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'd rather you didn't smoke here.</div>
      </div>
    `
  },

  // --- PASSIVE ADVANCED ---
  {
    id: 'b2_passive_reporting',
    title: "Passive with Reporting Verbs",
    desc: "Пассив с глаголами сообщения.",
    icon: 'fa-newspaper',
    content: `
      <h3>It + passive + that</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It is said that he is rich.</div>
        <div class="en-ex">It is believed that the Earth is round.</div>
        <div class="en-ex">It is reported that prices will rise.</div>
      </div>
      
      <h3>Subject + passive + to infinitive</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He is said to be rich.</div>
        <div class="en-ex">The Earth is believed to be round.</div>
        <div class="en-ex">Prices are reported to be rising.</div>
      </div>
      
      <h3>Common reporting verbs</h3>
      <ul>
        <li>say, believe, think, consider</li>
        <li>report, rumour, allege, claim</li>
        <li>know, expect, understand</li>
      </ul>
      
      <h3>Perfect infinitive для прошлого</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He is said to have been a spy.</div>
        <div class="ru-ex">Говорят, он был шпионом.</div>
      </div>
      
      <h3>Distancing (дистанцирование)</h3>
      <p>Используем для передачи информации без личной ответственности:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The company is alleged to have broken the law.</div>
      </div>
    `
  },
  {
    id: 'b2_have_something_done',
    title: "Have Something Done",
    desc: "Каузативная конструкция.",
    icon: 'fa-tools',
    content: `
      <h3>Have + object + past participle</h3>
      <p>Когда кто-то делает что-то для нас:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I had my hair cut yesterday.</div>
        <div class="ru-ex">Мне вчера постригли волосы.</div>
      </div>
      
      <h3>Во всех временах</h3>
      <ul>
        <li>I have my car washed. (present)</li>
        <li>I'm having my car washed. (continuous)</li>
        <li>I had my car washed. (past)</li>
        <li>I'll have my car washed. (future)</li>
        <li>I've had my car washed. (perfect)</li>
      </ul>
      
      <h3>Get something done (разговорный)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I got my car fixed. = I had my car fixed.</div>
      </div>
      
      <h3>Have something done (неприятности)</h3>
      <p>Также для неприятных событий:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I had my wallet stolen.</div>
        <div class="ru-ex">У меня украли кошелек.</div>
      </div>
      
      <h3>Have someone do vs Have something done</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I had John fix my car. (Джон починил)</div>
        <div class="en-ex">I had my car fixed. (кто-то починил)</div>
      </div>
    `
  },
  {
    id: 'b2_passive_two_objects',
    title: "Passive with Two Objects",
    desc: "Пассив с двумя дополнениями.",
    icon: 'fa-gift',
    content: `
      <h3>Два варианта пассива</h3>
      <p>Active: John gave me a book.</p>
      
      <p><strong>Вариант 1</strong> (чаще - person становится subject):</p>
      <div class="grammar-example-box">
        <div class="en-ex">I was given a book (by John).</div>
      </div>
      
      <p><strong>Вариант 2</strong> (реже - thing становится subject):</p>
      <div class="grammar-example-box">
        <div class="en-ex">A book was given to me (by John).</div>
      </div>
      
      <h3>Common verbs with two objects</h3>
      <ul>
        <li>give, send, show, offer, promise</li>
        <li>teach, tell, pay, lend</li>
        <li>buy, make, cook, get (+ for)</li>
      </ul>
      
      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She was offered a job.</div>
        <div class="en-ex">We were told the news.</div>
        <div class="en-ex">I was bought a present.</div>
      </div>
    `
  },

  // --- INFINITIVES & GERUNDS ADVANCED ---
  {
    id: 'b2_complex_gerunds',
    title: "Complex Forms of Gerunds & Infinitives",
    desc: "Сложные формы герундия и инфинитива.",
    icon: 'fa-code-branch',
    content: `
      <h3>Perfect Infinitive (to have done)</h3>
      <p>Действие произошло раньше:</p>
      <div class="grammar-example-box">
        <div class="en-ex">He claims to have seen a UFO.</div>
        <div class="en-ex">She seems to have forgotten.</div>
      </div>
      
      <h3>Perfect Gerund (having done)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He denied having stolen the money.</div>
        <div class="en-ex">I regret having said that.</div>
      </div>
      
      <h3>Passive Infinitive (to be done)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She wants to be promoted.</div>
        <div class="en-ex">He expects to be invited.</div>
      </div>
      
      <h3>Passive Gerund (being done)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I hate being ignored.</div>
        <div class="en-ex">She enjoys being photographed.</div>
      </div>
      
      <h3>Perfect Passive Forms</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He claims to have been attacked. (perfect passive infinitive)</div>
        <div class="en-ex">She remembers having been told. (perfect passive gerund)</div>
      </div>
    `
  },
  {
    id: 'b2_verb_object_patterns',
    title: "Verb + Object + Infinitive/Gerund",
    desc: "Глагол + дополнение + инфинитив/герундий.",
    icon: 'fa-sitemap',
    content: `
      <h3>Verb + object + to-infinitive</h3>
      <ul>
        <li>advise, allow, encourage, force</li>
        <li>invite, order, persuade, remind</li>
        <li>teach, tell, want, warn</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">I want you to come.</div>
        <div class="en-ex">She advised me to wait.</div>
      </div>
      
      <h3>Verb + object + infinitive (без to)</h3>
      <ul>
        <li>let, make, help (help может с to)</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">Let me go!</div>
        <div class="en-ex">She made him apologize.</div>
      </div>
      
      <h3>Verb + object + -ing</h3>
      <ul>
        <li>see, hear, watch, notice, feel (восприятие)</li>
        <li>catch, find, leave (обнаружение)</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">I saw him running.</div>
        <div class="en-ex">I caught her stealing.</div>
      </div>
      
      <h3>See/Hear + infinitive vs -ing</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I saw him cross the road. (все действие)</div>
        <div class="en-ex">I saw him crossing the road. (в процессе)</div>
      </div>
    `
  },
  {
    id: 'b2_reporting_verbs',
    title: "Reporting Verbs Patterns",
    desc: "Глаголы передачи речи и их модели.",
    icon: 'fa-comment-dots',
    content: `
      <h3>Verb + to-infinitive</h3>
      <ul>
        <li>agree, offer, promise, refuse, threaten</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">He agreed to help.</div>
      </div>
      
      <h3>Verb + -ing</h3>
      <ul>
        <li>admit, deny, suggest</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">She denied stealing.</div>
      </div>
      
      <h3>Verb + object + to-infinitive</h3>
      <ul>
        <li>advise, encourage, invite, remind, warn</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">He advised me to wait.</div>
      </div>
      
      <h3>Verb + that clause</h3>
      <ul>
        <li>admit, agree, claim, explain, suggest</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">She explained that she was late.</div>
      </div>
      
      <h3>Verb + preposition + -ing</h3>
      <ul>
        <li>apologize for, insist on, accuse of</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">He apologized for being late.</div>
      </div>
    `
  },

  // --- ARTICLES & PRONOUNS ---
  {
    id: 'b2_generic_pronouns',
    title: "Generic & Gender-neutral Pronouns",
    desc: "Обобщающие и гендерно-нейтральные местоимения.",
    icon: 'fa-users',
    content: `
      <h3>They/Their для singular (гендерно-нейтрально)</h3>
      <p>Современное использование для избежания he/she:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Someone left their bag. (вместо his/her)</div>
        <div class="en-ex">Each student should bring their book.</div>
      </div>
      
      <h3>One (формальный стиль)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">One should always be polite.</div>
        <div class="en-ex">One never knows what might happen.</div>
      </div>
      
      <h3>You (обобщенное)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You never know what might happen.</div>
        <div class="ru-ex">Никогда не знаешь, что может случиться.</div>
      </div>
      
      <h3>People/They (люди вообще)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">People say he's rich. = They say he's rich.</div>
      </div>
      
      <h3>It для обобщений</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It is important to study.</div>
        <div class="en-ex">It's said that...</div>
      </div>
    `
  },
  {
    id: 'b2_compound_nouns',
    title: "Compound Nouns & Possessives",
    desc: "Составные существительные и притяжательные формы.",
    icon: 'fa-compress',
    content: `
      <h3>Compound Nouns (N + N)</h3>
      <p>Первое существительное описывает второе:</p>
      <ul>
        <li>bus stop (автобусная остановка)</li>
        <li>coffee cup (кофейная чашка)</li>
        <li>computer screen (экран компьютера)</li>
      </ul>
      
      <h3>Множественное число</h3>
      <p>Обычно меняется только второе слово:</p>
      <div class="grammar-example-box">
        <div class="en-ex">bus stops, coffee cups (NOT: buses stop)</div>
      </div>
      
      <h3>Possessive vs Compound</h3>
      <div class="grammar-example-box">
        <div class="en-ex">John's car (машина Джона - владение)</div>
        <div class="en-ex">car door (дверь машины - часть)</div>
      </div>
      
      <h3>Possessive с временем</h3>
      <div class="grammar-example-box">
        <div class="en-ex">two hours' walk (двухчасовая прогулка)</div>
        <div class="en-ex">a month's salary (месячная зарплата)</div>
        <div class="en-ex">in three weeks' time (через три недели)</div>
      </div>
      
      <h3>Double possessive</h3>
      <div class="grammar-example-box">
        <div class="en-ex">a friend of John's (один из друзей Джона)</div>
        <div class="en-ex">a book of mine (одна из моих книг)</div>
      </div>
    `
  },

  // --- RELATIVE CLAUSES ADVANCED ---
  {
    id: 'b2_relative_advanced',
    title: "Advanced Relative Clauses",
    desc: "Продвинутые относительные предложения.",
    icon: 'fa-link',
    content: `
      <h3>Prepositions in relative clauses</h3>
      <p>Разговорный (предлог в конце):</p>
      <div class="grammar-example-box">
        <div class="en-ex">The person who I talked to...</div>
      </div>
      <p>Формальный (предлог перед):</p>
      <div class="grammar-example-box">
        <div class="en-ex">The person to whom I talked...</div>
      </div>
      
      <h3>What = the thing(s) which</h3>
      <div class="grammar-example-box">
        <div class="en-ex">What I need is a vacation.</div>
        <div class="en-ex">I don't understand what you mean.</div>
      </div>
      
      <h3>Reduced relative clauses</h3>
      <p>Опускаем who/which + be:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The man (who is) sitting there...</div>
        <div class="en-ex">The book (which was) written by...</div>
      </div>
      
      <h3>Commenting on whole clause</h3>
      <p>Which относится ко всему предложению:</p>
      <div class="grammar-example-box">
        <div class="en-ex">He passed the exam, which surprised everyone.</div>
      </div>
      
      <h3>Quantifiers + of which/whom</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I have three brothers, all of whom live abroad.</div>
        <div class="en-ex">She wrote ten books, most of which were bestsellers.</div>
      </div>
    `
  },

  // --- EMPHASIS & INVERSION ---
  {
    id: 'b2_inversion',
    title: "Inversion for Emphasis",
    desc: "Инверсия для усиления.",
    icon: 'fa-exchange-alt',
    content: `
      <h3>Negative adverbials</h3>
      <p>После отрицательных наречий - инверсия:</p>
      <ul>
        <li><strong>Never</strong> have I seen such a thing!</li>
        <li><strong>Rarely</strong> does she make mistakes.</li>
        <li><strong>Seldom</strong> do we have such opportunities.</li>
        <li><strong>Hardly ever</strong> does he complain.</li>
      </ul>
      
      <h3>Not only... but also</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Not only did he lie, but he also stole money.</div>
      </div>
      
      <h3>No sooner... than / Hardly... when</h3>
      <div class="grammar-example-box">
        <div class="en-ex">No sooner had I left than it started raining.</div>
        <div class="en-ex">Hardly had we arrived when the trouble started.</div>
      </div>
      
      <h3>Only + time/place</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Only then did I understand.</div>
        <div class="en-ex">Only in Paris can you find such food.</div>
      </div>
      
      <h3>So/Such для усиления</h3>
      <div class="grammar-example-box">
        <div class="en-ex">So tired was he that he fell asleep immediately.</div>
        <div class="en-ex">Such was his anger that he couldn't speak.</div>
      </div>
    `
  },
  {
    id: 'b2_cleft_sentences',
    title: "Cleft Sentences",
    desc: "Расщепленные предложения для выделения.",
    icon: 'fa-cut',
    content: `
      <h3>It + be... that/who (выделяем элемент)</h3>
      <p>Normal: John broke the window yesterday.</p>
      <div class="grammar-example-box">
        <div class="en-ex">It was John who broke the window. (именно Джон)</div>
        <div class="en-ex">It was the window that John broke. (именно окно)</div>
        <div class="en-ex">It was yesterday that John broke the window. (именно вчера)</div>
      </div>
      
      <h3>What... is/was (выделяем действие)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">What I need is a holiday.</div>
        <div class="en-ex">What annoys me is his attitude.</div>
        <div class="en-ex">What happened was that he forgot.</div>
      </div>
      
      <h3>The thing/person/place... is</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The thing (that) I hate is waiting.</div>
        <div class="en-ex">The person who helped me was John.</div>
      </div>
      
      <h3>All (that)... is</h3>
      <div class="grammar-example-box">
        <div class="en-ex">All I want is some peace.</div>
        <div class="en-ex">All you need to do is sign here.</div>
      </div>
    `
  },
  {
    id: 'b2_participle_clauses',
    title: "Participle Clauses",
    desc: "Причастные обороты.",
    icon: 'fa-compress-alt',
    content: `
      <h3>Present Participle (-ing) для одновременности</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Walking down the street, I met John.</div>
        <div class="ru-ex">Идя по улице, я встретил Джона.</div>
      </div>
      
      <h3>Perfect Participle (having done) для предшествования</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Having finished work, she went home.</div>
        <div class="ru-ex">Закончив работу, она пошла домой.</div>
      </div>
      
      <h3>Past Participle (done) для пассива</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Built in 1900, the house is very old.</div>
        <div class="ru-ex">Построенный в 1900, дом очень старый.</div>
      </div>
      
      <h3>Причина и условие</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Being tired, I went to bed early. (= Because I was tired)</div>
        <div class="en-ex">Used properly, this tool is very effective. (= If it is used)</div>
      </div>
      
      <h3>⚠️ Важно: одинаковый subject</h3>
      <p>Подлежащее должно быть одинаковым в обеих частях!</p>
      <div class="grammar-example-box">
        <div class="en-ex">❌ Walking home, the rain started.</div>
        <div class="en-ex">✓ Walking home, I got wet in the rain.</div>
      </div>
    `
  },

  // --- ADVERBS & ADJECTIVES ADVANCED ---
  {
    id: 'b2_adverb_position',
    title: "Advanced Adverb Position",
    desc: "Позиция наречий в сложных конструкциях.",
    icon: 'fa-sort',
    content: `
      <h3>Mid-position adverbs</h3>
      <p>После первого вспомогательного глагола:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I have never been to Paris.</div>
        <div class="en-ex">She has always been working here.</div>
      </div>
      
      <h3>Front position для emphasis</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Fortunately, nobody was hurt.</div>
        <div class="en-ex">Surprisingly, he agreed.</div>
      </div>
      
      <h3>Comment adverbs</h3>
      <ul>
        <li>apparently, clearly, obviously</li>
        <li>fortunately, unfortunately</li>
        <li>surprisingly, amazingly</li>
      </ul>
      
      <h3>Viewpoint adverbs</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Financially, it's a good decision.</div>
        <div class="en-ex">Politically speaking, it's risky.</div>
      </div>
      
      <h3>Порядок наречий в конце</h3>
      <p>Manner → Place → Time:</p>
      <div class="grammar-example-box">
        <div class="en-ex">She sang beautifully at the concert yesterday.</div>
      </div>
    `
  },
  {
    id: 'b2_adjective_order',
    title: "Adjective Order",
    desc: "Порядок прилагательных.",
    icon: 'fa-list-ol',
    content: `
      <h3>Стандартный порядок</h3>
      <p>Opinion → Size → Age → Shape → Color → Origin → Material → Purpose</p>
      <div class="grammar-example-box">
        <div class="en-ex">a beautiful small old round blue Chinese ceramic cooking pot</div>
      </div>
      
      <h3>Практический порядок (чаще используется)</h3>
      <ol>
        <li><strong>Opinion</strong>: nice, beautiful, horrible</li>
        <li><strong>Size</strong>: big, small, huge</li>
        <li><strong>Age</strong>: old, new, ancient</li>
        <li><strong>Color</strong>: red, blue, green</li>
        <li><strong>Origin</strong>: French, Japanese</li>
        <li><strong>Material</strong>: wooden, plastic</li>
      </ol>
      
      <h3>Примеры</h3>
      <div class="grammar-example-box">
        <div class="en-ex">a nice big new red Italian sports car</div>
        <div class="en-ex">a horrible small old wooden chair</div>
      </div>
      
      <h3>Запятые между однотипными</h3>
      <div class="grammar-example-box">
        <div class="en-ex">a smart, intelligent, hard-working student</div>
      </div>
    `
  },
  {
    id: 'b2_modifying_adverbs',
    title: "Modifying Adverbs",
    desc: "Наречия-модификаторы: quite, rather, pretty, fairly.",
    icon: 'fa-sliders-h',
    content: `
      <h3>Fairly (довольно - слабее)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It's fairly good. (неплохо, но не отлично)</div>
      </div>
      
      <h3>Quite (вполне - средне)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It's quite good. (вполне хорошо)</div>
      </div>
      <p>С неградуируемыми = completely:</p>
      <div class="grammar-example-box">
        <div class="en-ex">It's quite perfect. (совершенно идеально)</div>
      </div>
      
      <h3>Rather (довольно - сильнее)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It's rather expensive. (довольно дорого - негатив)</div>
      </div>
      
      <h3>Pretty (довольно - разговорное)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It's pretty good. (довольно хорошо)</div>
      </div>
      
      <h3>Quite a/an + noun</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It was quite a surprise.</div>
        <div class="en-ex">She's quite a good singer. = She's a quite good singer.</div>
      </div>
    `
  },

  // --- DISCOURSE & LINKING ---
  {
    id: 'b2_discourse_markers',
    title: "Discourse Markers",
    desc: "Дискурсивные маркеры и связующие слова.",
    icon: 'fa-link',
    content: `
      <h3>Adding information</h3>
      <ul>
        <li>Moreover, Furthermore, In addition (формально)</li>
        <li>Also, Besides, What's more (нейтрально)</li>
      </ul>
      
      <h3>Contrast</h3>
      <ul>
        <li>However, Nevertheless, Nonetheless (формально)</li>
        <li>On the other hand, In contrast</li>
        <li>Yet, Still (в начале предложения)</li>
      </ul>
      
      <h3>Result</h3>
      <ul>
        <li>Therefore, Consequently, As a result</li>
        <li>Thus, Hence (очень формально)</li>
      </ul>
      
      <h3>Examples & Clarification</h3>
      <ul>
        <li>For instance, For example</li>
        <li>Namely, That is (to say), i.e.</li>
        <li>In other words</li>
      </ul>
      
      <h3>Sequencing</h3>
      <ul>
        <li>Firstly, Secondly, Finally</li>
        <li>Subsequently, Previously</li>
        <li>Meanwhile, In the meantime</li>
      </ul>
      
      <h3>Summarizing</h3>
      <ul>
        <li>In conclusion, To sum up</li>
        <li>Overall, On the whole</li>
        <li>All in all, In brief</li>
      </ul>
    `
  },

  // --- AUXILIARY VERBS & ELLIPSIS ---
  {
    id: 'b2_ellipsis',
    title: "Ellipsis and Substitution",
    desc: "Опущение и замена для избежания повторов.",
    icon: 'fa-compress',
    content: `
      <h3>Ellipsis после auxiliary</h3>
      <p>Опускаем основной глагол после вспомогательного:</p>
      <div class="grammar-example-box">
        <div class="en-ex">- Can you swim? - Yes, I can (swim).</div>
        <div class="en-ex">He said he would help, and he did (help).</div>
      </div>
      
      <h3>So/Not после глаголов мнения</h3>
      <div class="grammar-example-box">
        <div class="en-ex">- Is it raining? - I think so. / I don't think so.</div>
        <div class="en-ex">- Will he come? - I hope so. / I hope not.</div>
      </div>
      <p>Глаголы: think, hope, believe, suppose, expect, afraid</p>
      
      <h3>Do so = repeat action</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He asked me to leave, so I did so.</div>
      </div>
      
      <h3>One/Ones для замены существительных</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I prefer the red one. (= the red car)</div>
        <div class="en-ex">These shoes are better than those ones.</div>
      </div>
      
      <h3>Ellipsis в comparisons</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She's taller than I am. = She's taller than me.</div>
        <div class="en-ex">I work as hard as you (do).</div>
      </div>
    `
  }
],

      "C1": [
  // --- ADVANCED PAST TENSES ---
  {
    id: 'c1_narrative_advanced',
    title: "Advanced Narrative Techniques",
    desc: "Сложные приемы повествования.",
    icon: 'fa-book-open',
    content: `
      <h3>Would для привычек в прошлом</h3>
      <p>Только для повторяющихся действий (не состояний):</p>
      <div class="grammar-example-box">
        <div class="en-ex">Every evening, he would sit by the fire and read.</div>
        <div class="ru-ex">Каждый вечер он сидел у камина и читал.</div>
      </div>
      <p>⚠️ Нельзя с состояниями:</p>
      <div class="grammar-example-box">
        <div class="en-ex">✓ I used to live in Paris.</div>
        <div class="en-ex">❌ I would live in Paris.</div>
      </div>
      
      <h3>Past Perfect для flashbacks</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He looked tired. He had been working all night and hadn't slept at all.</div>
      </div>
      
      <h3>Historical present для драматизма</h3>
      <p>Используем Present для рассказа о прошлом:</p>
      <div class="grammar-example-box">
        <div class="en-ex">So I'm walking down the street when suddenly this guy appears...</div>
      </div>
      
      <h3>Was/Were to для судьбы</h3>
      <p>Для событий, которые были предрешены:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Little did he know that this was to be their last meeting.</div>
        <div class="ru-ex">Он и не подозревал, что это будет их последняя встреча.</div>
      </div>
    `
  },

  // --- ADVANCED FUTURE ---
  {
    id: 'c1_future_complex',
    title: "Complex Future Expressions",
    desc: "Сложные способы выражения будущего.",
    icon: 'fa-crystal-ball',
    content: `
      <h3>Be bound to (обязательно)</h3>
      <p>Практически гарантированный результат:</p>
      <div class="grammar-example-box">
        <div class="en-ex">He's bound to find out sooner or later.</div>
        <div class="ru-ex">Он обязательно узнает рано или поздно.</div>
      </div>
      
      <h3>Be likely/unlikely to</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She's likely to accept the offer.</div>
        <div class="en-ex">They're unlikely to change their mind.</div>
      </div>
      
      <h3>Be set/destined to</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The company is set to launch a new product.</div>
        <div class="en-ex">He was destined to become a great leader.</div>
      </div>
      
      <h3>Be poised to (на грани)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The economy is poised to recover.</div>
        <div class="ru-ex">Экономика на пороге восстановления.</div>
      </div>
      
      <h3>Stand to + infinitive (рискует получить)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She stands to gain millions from the deal.</div>
        <div class="en-ex">We stand to lose everything.</div>
      </div>
    `
  },

  // --- ADVANCED MODALS ---
  {
    id: 'c1_modal_perfect_advanced',
    title: "Modal Perfect - All Nuances",
    desc: "Все оттенки модальных глаголов о прошлом.",
    icon: 'fa-exclamation-circle',
    content: `
      <h3>Should/Ought to have (критика/сожаление)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You should have told me earlier!</div>
        <div class="ru-ex">Тебе следовало сказать мне раньше!</div>
      </div>
      
      <h3>Shouldn't have (зря сделал)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I shouldn't have said that.</div>
        <div class="ru-ex">Мне не следовало этого говорить.</div>
      </div>
      
      <h3>Could have (упущенная возможность)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">We could have won if we'd tried harder.</div>
        <div class="ru-ex">Мы могли бы выиграть, если бы старались больше.</div>
      </div>
      
      <h3>May/Might have (возможно было)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He may have forgotten about the meeting.</div>
      </div>
      
      <h3>Must have vs Can't/Couldn't have</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He must have been lying. (уверенность в утверждении)</div>
        <div class="en-ex">He can't have been lying. (уверенность в отрицании)</div>
      </div>
      
      <h3>Would have (в условных)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I would have helped if you'd asked.</div>
      </div>
      
      <h3>Needn't have vs Didn't need to</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You needn't have waited. (ждал зря)</div>
        <div class="en-ex">You didn't need to wait. (не было необходимости)</div>
      </div>
    `
  },
  {
    id: 'c1_speculation_advanced',
    title: "Advanced Speculation & Deduction",
    desc: "Сложные формы предположений.",
    icon: 'fa-search',
    content: `
      <h3>Continuous forms</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He must be working now. (наверняка работает)</div>
        <div class="en-ex">She may be sleeping. (возможно спит)</div>
        <div class="en-ex">They can't be serious. (не могут быть серьезны)</div>
      </div>
      
      <h3>Perfect continuous</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He must have been waiting for hours.</div>
        <div class="ru-ex">Он, должно быть, ждал часами.</div>
      </div>
      
      <h3>Passive forms</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The house must have been built in the 1800s.</div>
        <div class="en-ex">He may have been promoted.</div>
      </div>
      
      <h3>Appear/Seem to</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He appears to have left.</div>
        <div class="en-ex">She seems to be enjoying herself.</div>
      </div>
      
      <h3>Evidently, Apparently, Presumably</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Evidently, they've changed their minds.</div>
        <div class="en-ex">Apparently, he's been fired.</div>
        <div class="en-ex">Presumably, she knows about this.</div>
      </div>
    `
  },

  // --- ADVANCED CONDITIONALS ---
  {
    id: 'c1_conditionals_inversion',
    title: "Conditionals with Inversion",
    desc: "Условные предложения с инверсией.",
    icon: 'fa-exchange-alt',
    content: `
      <h3>Had + subject (вместо If + Past Perfect)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Had I known, I would have told you.</div>
        <div class="ru-ex">= If I had known, I would have told you.</div>
      </div>
      
      <h3>Were + subject (вместо If + Past Simple)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Were I you, I would accept.</div>
        <div class="ru-ex">= If I were you, I would accept.</div>
      </div>
      
      <h3>Should + subject (вместо If + Present)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Should you need help, call me.</div>
        <div class="ru-ex">= If you should need help, call me.</div>
      </div>
      
      <h3>Had it not been for (если бы не)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Had it not been for your help, I would have failed.</div>
        <div class="ru-ex">Если бы не твоя помощь, я бы провалился.</div>
      </div>
      
      <h3>Were it not for (если бы не - настоящее)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Were it not for his support, I couldn't do this.</div>
      </div>
    `
  },
  {
    id: 'c1_advanced_conditionals',
    title: "All Conditional Types - Mastery",
    desc: "Полное владение условными предложениями.",
    icon: 'fa-sitemap',
    content: `
      <h3>Zero Conditional (всегда верно)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If you heat water to 100°C, it boils.</div>
      </div>
      
      <h3>First Conditional (реальное будущее)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If it rains, we'll stay home.</div>
      </div>
      
      <h3>Second Conditional (нереальное настоящее)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If I had money, I would travel.</div>
      </div>
      
      <h3>Third Conditional (нереальное прошлое)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If I had studied, I would have passed.</div>
      </div>
      
      <h3>Mixed Conditionals (смешанные)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If I had studied medicine, I would be a doctor now.</div>
        <div class="en-ex">If I were rich, I would have bought that house.</div>
      </div>
      
      <h3>Implied conditions (подразумеваемые)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Otherwise, we'll be late. (= If we don't hurry)</div>
        <div class="en-ex">In that case, I'll go. (= If that happens)</div>
      </div>
    `
  },
  {
    id: 'c1_wish_advanced',
    title: "Advanced Wish Structures",
    desc: "Продвинутые конструкции с wish.",
    icon: 'fa-star',
    content: `
      <h3>Wish + Past Perfect (сожаление о прошлом)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I wish I had listened to your advice.</div>
        <div class="ru-ex">Жаль, что я не послушал твоего совета.</div>
      </div>
      
      <h3>Wish + would (раздражение/изменения)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I wish you would stop smoking!</div>
        <div class="en-ex">I wish it would stop raining.</div>
      </div>
      
      <h3>If only (более эмоционально)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">If only I had more time!</div>
        <div class="en-ex">If only he would listen to me!</div>
      </div>
      
      <h3>It's (high/about) time</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It's time we left. (Пора нам уходить)</div>
        <div class="en-ex">It's high time you got a job! (Тебе давно пора найти работу!)</div>
      </div>
      
      <h3>Would rather + past (о других)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'd rather you didn't tell anyone.</div>
        <div class="ru-ex">Я бы предпочел, чтобы ты никому не рассказывал.</div>
      </div>
      
      <h3>Would sooner/just as soon</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'd sooner die than apologize to him.</div>
      </div>
    `
  },

  // --- ADVANCED PASSIVE ---
  {
    id: 'c1_passive_distancing',
    title: "Passive for Distancing",
    desc: "Пассив для дистанцирования.",
    icon: 'fa-user-shield',
    content: `
      <h3>Reporting verbs (безличный стиль)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It is said that he is very rich.</div>
        <div class="en-ex">He is said to be very rich.</div>
      </div>
      
      <h3>Различные reporting verbs</h3>
      <ul>
        <li><strong>say, report, claim, allege</strong></li>
        <li><strong>believe, think, consider, know</strong></li>
        <li><strong>expect, understand, assume</strong></li>
      </ul>
      
      <h3>С Perfect Infinitive (о прошлом)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He is believed to have left the country.</div>
        <div class="ru-ex">Полагают, что он покинул страну.</div>
      </div>
      
      <h3>С Continuous (о процессе)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She is thought to be hiding somewhere.</div>
      </div>
      
      <h3>Allege (обвинять - юридический)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The company is alleged to have broken the law.</div>
        <div class="ru-ex">Компанию обвиняют в нарушении закона.</div>
      </div>
      
      <h3>Rumour (слухи)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He is rumoured to be leaving the company.</div>
      </div>
    `
  },

  // --- ADVANCED INFINITIVE & GERUND ---
  {
    id: 'c1_perfect_infinitive_gerund',
    title: "Perfect Aspect in Infinitives & Gerunds",
    desc: "Перфектный вид в инфинитивах и герундиях.",
    icon: 'fa-layer-group',
    content: `
      <h3>Perfect Infinitive (to have done)</h3>
      <p>Действие произошло раньше главного глагола:</p>
      <div class="grammar-example-box">
        <div class="en-ex">He claims to have seen a UFO.</div>
        <div class="en-ex">She appears to have left already.</div>
        <div class="en-ex">I'm glad to have met you.</div>
      </div>
      
      <h3>Perfect Gerund (having done)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He denied having stolen the money.</div>
        <div class="en-ex">I regret having said that.</div>
        <div class="en-ex">After having finished work, she went home.</div>
      </div>
      
      <h3>Perfect Passive Infinitive</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He claims to have been attacked.</div>
        <div class="en-ex">The building appears to have been abandoned.</div>
      </div>
      
      <h3>Perfect Passive Gerund</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He complained about having been ignored.</div>
      </div>
      
      <h3>Когда использовать Perfect forms</h3>
      <p>Когда действие инфинитива/герундия произошло <strong>до</strong> действия главного глагола:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I'm sorry to disturb you. (сейчас)</div>
        <div class="en-ex">I'm sorry to have disturbed you. (уже побеспокоил)</div>
      </div>
    `
  },

  // --- ADVANCED NOUN STRUCTURES ---
  {
    id: 'c1_nominalization',
    title: "Nominalization",
    desc: "Номинализация для формального стиля.",
    icon: 'fa-font',
    content: `
      <h3>Что это?</h3>
      <p>Превращение глаголов в существительные для формального стиля:</p>
      
      <h3>Verb → Noun</h3>
      <ul>
        <li>decide → decision</li>
        <li>develop → development</li>
        <li>fail → failure</li>
        <li>grow → growth</li>
        <li>succeed → success</li>
      </ul>
      
      <h3>Сравнение стилей</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Informal: When we arrived, everyone was surprised.</div>
        <div class="en-ex">Formal: Our arrival caused general surprise.</div>
      </div>
      
      <div class="grammar-example-box">
        <div class="en-ex">Informal: The government decided to change the law.</div>
        <div class="en-ex">Formal: The government's decision to change the law...</div>
      </div>
      
      <h3>Abstract nouns с предлогами</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The increase in prices...</div>
        <div class="en-ex">His failure to attend...</div>
        <div class="en-ex">The development of technology...</div>
      </div>
    `
  },
  {
    id: 'c1_compound_possessive',
    title: "Advanced Possessive Forms",
    desc: "Сложные притяжательные конструкции.",
    icon: 'fa-key',
    content: `
      <h3>Time expressions (времени)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">a day's work (дневная работа)</div>
        <div class="en-ex">two weeks' notice (уведомление за две недели)</div>
        <div class="en-ex">in three years' time (через три года)</div>
        <div class="en-ex">a moment's hesitation (секундное колебание)</div>
      </div>
      
      <h3>Value/Distance (ценность/расстояние)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">ten dollars' worth (на десять долларов)</div>
        <div class="en-ex">a stone's throw away (в двух шагах)</div>
      </div>
      
      <h3>Double possessive (двойной притяжательный)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">a friend of John's (один из друзей Джона)</div>
        <div class="en-ex">that car of his (та его машина)</div>
        <div class="en-ex">this idea of yours (эта твоя идея)</div>
      </div>
      
      <h3>Independent possessive</h3>
      <div class="grammar-example-box">
        <div class="en-ex">at the doctor's (в кабинете врача)</div>
        <div class="en-ex">at my parents' (у родителей)</div>
        <div class="en-ex">St Paul's (собор Св. Павла)</div>
      </div>
      
      <h3>Compound possessives</h3>
      <div class="grammar-example-box">
        <div class="en-ex">my brother-in-law's car</div>
        <div class="en-ex">the King of Spain's daughter</div>
      </div>
    `
  },

  // --- ADVANCED RELATIVE CLAUSES ---
  {
    id: 'c1_sentential_relative',
    title: "Sentential Relative Clauses",
    desc: "Предложения, комментирующие все высказывание.",
    icon: 'fa-quote-right',
    content: `
      <h3>Which для комментария всего предложения</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He passed the exam, which surprised everyone.</div>
        <div class="ru-ex">Он сдал экзамен, что всех удивило.</div>
      </div>
      
      <h3>Preposition + which для стиля</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She had a principle from which she never departed.</div>
        <div class="en-ex">The company, in which I worked for 10 years, has closed.</div>
      </div>
      
      <h3>Quantifier + of which/whom</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I have three sisters, all of whom are married.</div>
        <div class="en-ex">He wrote 20 books, most of which were bestsellers.</div>
        <div class="en-ex">There were 50 applicants, none of whom was suitable.</div>
      </div>
      
      <h3>Whereby (посредством которого)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">They have a system whereby complaints are dealt with quickly.</div>
      </div>
      
      <h3>Wherein (в котором - очень формально)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">a situation wherein both parties benefit</div>
      </div>
    `
  },

  // --- EMPHASIS & INVERSION ---
  {
    id: 'c1_inversion_advanced',
    title: "Advanced Inversion",
    desc: "Продвинутая инверсия для выразительности.",
    icon: 'fa-exchange-alt',
    content: `
      <h3>Never/Rarely/Seldom</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Never have I seen such a mess!</div>
        <div class="en-ex">Rarely does she make mistakes.</div>
        <div class="en-ex">Seldom do we have such opportunities.</div>
      </div>
      
      <h3>Not only...but also</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Not only did he arrive late, but he also forgot the documents.</div>
      </div>
      
      <h3>No sooner...than / Hardly/Scarcely...when</h3>
      <div class="grammar-example-box">
        <div class="en-ex">No sooner had I sat down than the phone rang.</div>
        <div class="en-ex">Hardly had we left when it started raining.</div>
      </div>
      
      <h3>Little did I know/realize</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Little did I know that this would change everything.</div>
      </div>
      
      <h3>Under no circumstances</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Under no circumstances should you open this door.</div>
      </div>
      
      <h3>Only after/when/if</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Only after the exam did I realize my mistake.</div>
        <div class="en-ex">Only when you're older will you understand.</div>
      </div>
      
      <h3>So/Such + adjective</h3>
      <div class="grammar-example-box">
        <div class="en-ex">So beautiful was the view that we stayed for hours.</div>
        <div class="en-ex">Such was his anger that he couldn't speak.</div>
      </div>
    `
  },
  {
    id: 'c1_cleft_advanced',
    title: "Advanced Cleft Sentences",
    desc: "Продвинутые расщепленные предложения.",
    icon: 'fa-highlighter',
    content: `
      <h3>It-cleft (выделяем элемент)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It was John who/that broke the window.</div>
        <div class="en-ex">It's because of you that we're late.</div>
        <div class="en-ex">It's for this reason that I'm calling.</div>
      </div>
      
      <h3>Wh-cleft (выделяем действие/предмет)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">What I need is a holiday.</div>
        <div class="en-ex">What bothers me is his attitude.</div>
        <div class="en-ex">Where we went was Paris.</div>
      </div>
      
      <h3>Reversed wh-cleft</h3>
      <div class="grammar-example-box">
        <div class="en-ex">A holiday is what I need.</div>
        <div class="en-ex">Paris is where we went.</div>
      </div>
      
      <h3>All (that)...</h3>
      <div class="grammar-example-box">
        <div class="en-ex">All I want is some peace and quiet.</div>
        <div class="en-ex">All you need to do is sign here.</div>
      </div>
      
      <h3>The thing/person/place that...</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The thing that annoys me most is his arrogance.</div>
        <div class="en-ex">The reason (why) I called is...</div>
      </div>
      
      <h3>Pseudo-cleft с action</h3>
      <div class="grammar-example-box">
        <div class="en-ex">What he did was (to) lie to everyone.</div>
        <div class="en-ex">What I'm going to do is complain.</div>
      </div>
    `
  },

  // --- SUBJUNCTIVE ---
  {
    id: 'c1_subjunctive',
    title: "The Subjunctive Mood",
    desc: "Сослагательное наклонение в английском.",
    icon: 'fa-crown',
    content: `
      <h3>Mandative Subjunctive (требование)</h3>
      <p>После глаголов требования, предложения, важности:</p>
      <p><strong>suggest, recommend, insist, demand, request, propose, advise</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">I suggest (that) he be present at the meeting.</div>
        <div class="en-ex">She insisted (that) the meeting be postponed.</div>
        <div class="en-ex">It is essential that everyone attend.</div>
      </div>
      
      <h3>Формула: that + subject + infinitive (без to)</h3>
      <p>⚠️ Не меняется по лицам, не добавляется -s:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I recommend that she take the job. (NOT: takes)</div>
      </div>
      
      <h3>С adjectives важности</h3>
      <p><strong>essential, vital, crucial, important, necessary, imperative</strong></p>
      <div class="grammar-example-box">
        <div class="en-ex">It is essential that he be informed immediately.</div>
        <div class="en-ex">It is vital that she attend the meeting.</div>
      </div>
      
      <h3>Отрицание</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I suggest that he not be told.</div>
      </div>
      
      <h3>Альтернатива (британский английский)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I suggest (that) he should be present.</div>
      </div>
      
      <h3>Formulaic Subjunctive (фиксированные фразы)</h3>
      <ul>
        <li>Long live the Queen!</li>
        <li>God save the King!</li>
        <li>Be that as it may... (как бы то ни было)</li>
        <li>Far be it from me to... (не мне судить)</li>
      </ul>
    `
  },

  // --- DISCOURSE & STYLE ---
  {
    id: 'c1_discourse_advanced',
    title: "Advanced Discourse Markers",
    desc: "Продвинутые связки текста.",
    icon: 'fa-project-diagram',
    content: `
      <h3>Formal Addition</h3>
      <ul>
        <li><strong>Moreover, Furthermore</strong> - более того</li>
        <li><strong>Additionally, In addition</strong> - в добавление</li>
        <li><strong>Likewise, Similarly</strong> - подобно этому</li>
      </ul>
      
      <h3>Strong Contrast</h3>
      <ul>
        <li><strong>Nevertheless, Nonetheless</strong> - тем не менее</li>
        <li><strong>Conversely</strong> - наоборот</li>
        <li><strong>On the contrary</strong> - напротив</li>
        <li><strong>Notwithstanding</strong> - несмотря на</li>
      </ul>
      
      <h3>Consequence/Result</h3>
      <ul>
        <li><strong>Consequently, As a consequence</strong> - следовательно</li>
        <li><strong>Therefore, Thus, Hence</strong> - таким образом</li>
        <li><strong>Accordingly</strong> - соответственно</li>
        <li><strong>For this reason</strong> - по этой причине</li>
      </ul>
      
      <h3>Emphasis/Reinforcement</h3>
      <ul>
        <li><strong>Indeed, In fact</strong> - действительно</li>
        <li><strong>As a matter of fact</strong> - на самом деле</li>
        <li><strong>Notably, Particularly</strong> - особенно</li>
      </ul>
      
      <h3>Concession</h3>
      <ul>
        <li><strong>Admittedly</strong> - надо признать</li>
        <li><strong>Granted</strong> - допустим</li>
        <li><strong>Albeit</strong> - хотя (формально)</li>
      </ul>
      
      <h3>Exemplification</h3>
      <ul>
        <li><strong>For instance, For example</strong></li>
        <li><strong>To illustrate</strong> - чтобы проиллюстрировать</li>
        <li><strong>Namely</strong> - а именно</li>
      </ul>
      
      <h3>Summary/Conclusion</h3>
      <ul>
        <li><strong>In conclusion, To conclude</strong></li>
        <li><strong>To summarize, In summary</strong></li>
        <li><strong>Overall, On the whole</strong></li>
        <li><strong>Ultimately</strong> - в конечном счете</li>
      </ul>
    `
  },

  // --- ADVANCED PARTICIPLE CLAUSES ---
  {
    id: 'c1_participle_advanced',
    title: "Advanced Participle Clauses",
    desc: "Сложные причастные обороты.",
    icon: 'fa-cut',
    content: `
      <h3>Perfect Participle (having done)</h3>
      <p>Для действия, которое произошло раньше:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Having finished his work, he went home.</div>
        <div class="ru-ex">Закончив работу, он пошел домой.</div>
      </div>
      
      <h3>Being + adjective/noun</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Being ill, she couldn't attend. (= Because she was ill)</div>
        <div class="en-ex">Being a doctor, he knew what to do.</div>
      </div>
      
      <h3>Not + participle</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Not knowing what to say, I remained silent.</div>
      </div>
      
      <h3>Absolute Constructions (независимые)</h3>
      <p>С разными подлежащими:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The weather being nice, we went for a walk.</div>
        <div class="en-ex">All things considered, it wasn't too bad.</div>
        <div class="en-ex">Other things being equal, I'd prefer the cheaper option.</div>
      </div>
      
      <h3>Фиксированные фразы</h3>
      <ul>
        <li>Generally speaking - вообще говоря</li>
        <li>Strictly speaking - строго говоря</li>
        <li>Bearing in mind - имея в виду</li>
        <li>Judging from - судя по</li>
        <li>Considering - учитывая</li>
      </ul>
    `
  },

  // --- PREPARATORY IT & THERE ---
  {
    id: 'c1_preparatory_subjects',
    title: "Preparatory IT and THERE",
    desc: "Формальное подлежащее IT и THERE.",
    icon: 'fa-arrows-alt-h',
    content: `
      <h3>Preparatory IT</h3>
      <p>Используем когда реальное подлежащее - инфинитив или that-clause:</p>
      
      <h4>It + be + adjective + to-infinitive</h4>
      <div class="grammar-example-box">
        <div class="en-ex">It's difficult to learn Chinese.</div>
        <div class="en-ex">It's important to be on time.</div>
      </div>
      
      <h4>It + be + adjective + that-clause</h4>
      <div class="grammar-example-box">
        <div class="en-ex">It's obvious that he's lying.</div>
        <div class="en-ex">It's essential that everyone attend.</div>
      </div>
      
      <h4>It + seem/appear + that</h4>
      <div class="grammar-example-box">
        <div class="en-ex">It seems that we're lost.</div>
        <div class="en-ex">It appears that she's left.</div>
      </div>
      
      <h3>Preparatory THERE</h3>
      <p>Представляем новую информацию:</p>
      <div class="grammar-example-box">
        <div class="en-ex">There seems to be a problem.</div>
        <div class="en-ex">There's no point in arguing.</div>
        <div class="en-ex">There's no denying that he's talented.</div>
      </div>
      
      <h3>Complex structures с THERE</h3>
      <div class="grammar-example-box">
        <div class="en-ex">There is believed to be a solution.</div>
        <div class="en-ex">There are said to be hundreds of applicants.</div>
      </div>
    `
  },

  // --- ADVANCED PREPOSITIONS ---
  {
    id: 'c1_noun_preposition',
    title: "Noun + Preposition Collocations",
    desc: "50 важных коллокаций существительное + предлог.",
    icon: 'fa-plug',
    content: `
      <h3>Common Noun + Preposition</h3>
      <ul>
        <li><strong>advantage of/over</strong> - преимущество</li>
        <li><strong>alternative to</strong> - альтернатива</li>
        <li><strong>answer to</strong> - ответ на</li>
        <li><strong>approach to</strong> - подход к</li>
        <li><strong>attitude to/towards</strong> - отношение к</li>
        <li><strong>awareness of</strong> - осведомленность о</li>
        <li><strong>belief in</strong> - вера в</li>
        <li><strong>cause of</strong> - причина чего-то</li>
        <li><strong>comment on</strong> - комментарий к</li>
        <li><strong>connection between/with</strong> - связь между/с</li>
        <li><strong>contact with</strong> - контакт с</li>
        <li><strong>damage to</strong> - ущерб чему-то</li>
        <li><strong>decrease/increase in</strong> - снижение/рост</li>
        <li><strong>demand for</strong> - спрос на</li>
        <li><strong>difference between</strong> - разница между</li>
        <li><strong>difficulty in/with</strong> - трудность в</li>
        <li><strong>effect on</strong> - влияние на</li>
        <li><strong>example of</strong> - пример чего-то</li>
        <li><strong>exception to</strong> - исключение из</li>
        <li><strong>experience in/of</strong> - опыт в</li>
        <li><strong>lack of</strong> - отсутствие</li>
        <li><strong>need for</strong> - потребность в</li>
        <li><strong>reaction to</strong> - реакция на</li>
        <li><strong>reason for</strong> - причина для</li>
        <li><strong>relationship with/between</strong> - отношения с/между</li>
        <li><strong>solution to</strong> - решение для</li>
      </ul>
    `
  },

  // --- ADVANCED ADJECTIVES ---
  {
    id: 'c1_gradable_ungradable',
    title: "Gradable vs Ungradable Adjectives",
    desc: "Градуируемые и неградуируемые прилагательные.",
    icon: 'fa-thermometer-half',
    content: `
      <h3>Gradable Adjectives (степени)</h3>
      <p>Могут быть в разной степени:</p>
      <ul>
        <li>big, small, hot, cold, happy, angry</li>
      </ul>
      <p>Используем: very, quite, fairly, rather, extremely</p>
      <div class="grammar-example-box">
        <div class="en-ex">It's very hot. / It's quite big.</div>
      </div>
      
      <h3>Ungradable Adjectives (абсолютные)</h3>
      <p>Не могут быть в степенях (или есть, или нет):</p>
      <ul>
        <li>perfect, impossible, dead, unique, absolute</li>
        <li>enormous, tiny, freezing, boiling (extreme adjectives)</li>
      </ul>
      <p>Используем: absolutely, completely, totally, utterly</p>
      <div class="grammar-example-box">
        <div class="en-ex">It's absolutely perfect. (NOT: very perfect)</div>
        <div class="en-ex">It's completely impossible.</div>
      </div>
      
      <h3>Extreme Adjectives (усиленные)</h3>
      <p>Уже содержат "very" в значении:</p>
      <ul>
        <li>huge = very big</li>
        <li>tiny = very small</li>
        <li>exhausted = very tired</li>
        <li>freezing = very cold</li>
        <li>boiling = very hot</li>
        <li>furious = very angry</li>
        <li>delighted = very happy</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">I'm absolutely exhausted. (NOT: very exhausted)</div>
      </div>
    `
  },

  // --- ADVANCED VERB PATTERNS ---
  {
    id: 'c1_causative_verbs',
    title: "Causative Verbs: Make, Let, Have, Get",
    desc: "Каузативные глаголы.",
    icon: 'fa-hand-point-right',
    content: `
      <h3>Make + object + infinitive (заставить)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">My parents made me study hard.</div>
        <div class="ru-ex">Родители заставили меня усердно учиться.</div>
      </div>
      <p>В пассиве: be made to:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I was made to apologize.</div>
      </div>
      
      <h3>Let + object + infinitive (позволить)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She let me use her car.</div>
      </div>
      <p>В пассиве: be allowed to:</p>
      <div class="grammar-example-box">
        <div class="en-ex">We weren't allowed to leave.</div>
      </div>
      
      <h3>Have + object + infinitive (попросить сделать)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I'll have someone fix it.</div>
      </div>
      
      <h3>Have + object + past participle (услуга)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I had my car repaired.</div>
      </div>
      
      <h3>Get + object + to-infinitive (убедить)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I got him to help me.</div>
      </div>
      
      <h3>Get + object + past participle</h3>
      <div class="grammar-example-box">
        <div class="en-ex">I got my car repaired.</div>
      </div>
    `
  }
],
      
      "C2": [
  // --- SUBTLE GRAMMAR DISTINCTIONS ---
  {
    id: 'c2_aspect_distinctions',
    title: "Subtle Distinctions in Aspect & Tense",
    desc: "Тонкие различия в видо-временных формах.",
    icon: 'fa-search',
    content: `
      <h3>Present Perfect vs Present Perfect Continuous</h3>
      <p>Тонкие смысловые оттенки:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I've read the book. (завершенность, результат)</div>
        <div class="en-ex">I've been reading the book. (процесс, возможно незавершен)</div>
      </div>
      
      <h3>Past Simple vs Present Perfect в газетных заголовках</h3>
      <div class="grammar-example-box">
        <div class="en-ex">President announces new policy (газетный стиль)</div>
        <div class="en-ex">President has announced new policy (формальный)</div>
      </div>
      
      <h3>Will vs Shall (тонкие различия)</h3>
      <p><strong>Shall</strong> для формальных предложений и обязательств:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Shall we begin? (формально)</div>
        <div class="en-ex">The committee shall convene on Monday. (юридический)</div>
      </div>
      
      <h3>Stative verbs в Continuous для временности</h3>
      <div class="grammar-example-box">
        <div class="en-ex">You're being difficult. (сейчас ведешь себя сложно)</div>
        <div class="en-ex">You're difficult. (по характеру сложный)</div>
      </div>
      
      <h3>Historical Present в нарративе</h3>
      <div class="grammar-example-box">
        <div class="en-ex">So Shakespeare writes this masterpiece, and it becomes...</div>
      </div>
    `
  },

  // --- MODALITY NUANCES ---
  {
    id: 'c2_epistemic_deontic',
    title: "Epistemic vs Deontic Modality",
    desc: "Эпистемическая и деонтическая модальность.",
    icon: 'fa-balance-scale-right',
    content: `
      <h3>Epistemic (вероятность, знание)</h3>
      <p>Говорим о вероятности события:</p>
      <div class="grammar-example-box">
        <div class="en-ex">He may be at home. (возможно, он дома)</div>
        <div class="en-ex">It must be true. (должно быть, это правда)</div>
      </div>
      
      <h3>Deontic (обязательство, разрешение)</h3>
      <p>Говорим об обязательствах или разрешениях:</p>
      <div class="grammar-example-box">
        <div class="en-ex">You may leave now. (разрешение)</div>
        <div class="en-ex">You must attend. (обязательство)</div>
      </div>
      
      <h3>Различие с MAY</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He may come. (epistemic - возможно придет)</div>
        <div class="en-ex">You may go. (deontic - разрешаю)</div>
      </div>
      
      <h3>Dynamic modality (способность)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">She can speak five languages. (способность)</div>
      </div>
      
      <h3>Тонкие различия SHOULD</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He should be here by now. (epistemic - ожидание)</div>
        <div class="en-ex">You should study harder. (deontic - совет)</div>
      </div>
    `
  },

  // --- CONDITIONALS MASTERY ---
  {
    id: 'c2_conditional_rhetoric',
    title: "Rhetorical Conditionals",
    desc: "Риторические условные предложения.",
    icon: 'fa-comments',
    content: `
      <h3>Were it not for (формальное отрицание)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Were it not for his intervention, disaster would have ensued.</div>
        <div class="ru-ex">Если бы не его вмешательство, случилась бы катастрофа.</div>
      </div>
      
      <h3>But for / Save for</h3>
      <div class="grammar-example-box">
        <div class="en-ex">But for your help, I would have failed.</div>
        <div class="en-ex">Save for a few exceptions, the rule holds.</div>
      </div>
      
      <h3>Lest (чтобы не - архаичное)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He studied hard lest he (should) fail.</div>
        <div class="ru-ex">Он усердно учился, чтобы не провалиться.</div>
      </div>
      
      <h3>Should + subject в формальных условиях</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Should you require further assistance, please contact us.</div>
      </div>
      
      <h3>Were + subject для маловероятных событий</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Were the situation to deteriorate, we would reconsider.</div>
      </div>
    `
  },

  // --- PASSIVE ADVANCED ---
  {
    id: 'c2_passive_academic',
    title: "Passive in Academic & Scientific Writing",
    desc: "Пассив в научном стиле.",
    icon: 'fa-flask',
    content: `
      <h3>Агентивность в научном стиле</h3>
      <p>Опускаем агента для объективности:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The experiment was conducted over six months.</div>
        <div class="en-ex">It has been observed that...</div>
      </div>
      
      <h3>Distancing через пассив</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It is widely acknowledged that climate change poses risks.</div>
        <div class="en-ex">The phenomenon has been extensively documented.</div>
      </div>
      
      <h3>Пассив с modal perfects</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The data may have been corrupted.</div>
        <div class="en-ex">The results should have been verified.</div>
      </div>
      
      <h3>Existential passive</h3>
      <div class="grammar-example-box">
        <div class="en-ex">There is believed to be a correlation.</div>
        <div class="en-ex">There are thought to be several factors.</div>
      </div>
      
      <h3>Continuous passive в процессах</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The matter is being investigated.</div>
        <div class="en-ex">New methods are constantly being developed.</div>
      </div>
    `
  },

  // --- REPORTED SPEECH ADVANCED ---
  {
    id: 'c2_reporting_citation',
    title: "Citation & Attribution in Academic Writing",
    desc: "Цитирование и атрибуция в академическом стиле.",
    icon: 'fa-quote-left',
    content: `
      <h3>Integral citations (интегрированные)</h3>
      <p>Автор как часть предложения:</p>
      <div class="grammar-example-box">
        <div class="en-ex">Smith (2020) argues that...</div>
        <div class="en-ex">According to Jones et al. (2019),...</div>
        <div class="en-ex">As Thompson maintains,...</div>
      </div>
      
      <h3>Non-integral citations (неинтегрированные)</h3>
      <p>Автор в скобках:</p>
      <div class="grammar-example-box">
        <div class="en-ex">This phenomenon has been widely observed (Smith, 2020).</div>
      </div>
      
      <h3>Reporting verbs (тонкие различия)</h3>
      <ul>
        <li><strong>Neutral:</strong> state, report, describe, note</li>
        <li><strong>Tentative:</strong> suggest, indicate, imply, propose</li>
        <li><strong>Strong:</strong> argue, claim, assert, maintain, contend</li>
        <li><strong>Critical:</strong> criticize, refute, challenge, dispute</li>
      </ul>
      
      <h3>Hedging в reporting</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It has been suggested that...</div>
        <div class="en-ex">There appears to be evidence that...</div>
        <div class="en-ex">Research tends to indicate that...</div>
      </div>
      
      <h3>Boosting (усиление)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It is clear that...</div>
        <div class="en-ex">Evidence clearly demonstrates that...</div>
        <div class="en-ex">It is indisputable that...</div>
      </div>
    `
  },

  // --- NOMINALIZATION ---
  {
    id: 'c2_nominalization_advanced',
    title: "Advanced Nominalization",
    desc: "Продвинутая номинализация для формального стиля.",
    icon: 'fa-compress-arrows-alt',
    content: `
      <h3>Verb → Abstract Noun</h3>
      <ul>
        <li>analyze → analysis</li>
        <li>investigate → investigation</li>
        <li>conclude → conclusion</li>
        <li>imply → implication</li>
        <li>perceive → perception</li>
        <li>intervene → intervention</li>
      </ul>
      
      <h3>Transformation Examples</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Informal: When we analyzed the data, we discovered...</div>
        <div class="en-ex">Formal: The analysis of the data revealed...</div>
      </div>
      
      <div class="grammar-example-box">
        <div class="en-ex">Informal: Because the economy failed, people lost jobs.</div>
        <div class="en-ex">Formal: The failure of the economy resulted in job losses.</div>
      </div>
      
      <h3>Complex nominal groups</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The implementation of the proposed regulatory framework modifications</div>
      </div>
      
      <h3>Prepositional phrases с nominalizations</h3>
      <ul>
        <li>the development of technology</li>
        <li>the impact of globalization on economies</li>
        <li>the relationship between education and employment</li>
      </ul>
      
      <h3>Когда избегать nominalization</h3>
      <p>Не перегружайте текст - баланс важен:</p>
      <div class="grammar-example-box">
        <div class="en-ex">❌ The implementation of the facilitation of the improvement...</div>
        <div class="en-ex">✓ To implement and facilitate improvements...</div>
      </div>
    `
  },

  // --- RELATIVE CLAUSES MASTERY ---
  {
    id: 'c2_relative_complex',
    title: "Free Relatives & Complex Structures",
    desc: "Свободные относительные и сложные структуры.",
    icon: 'fa-project-diagram',
    content: `
      <h3>Free Relatives (whatever, whoever, etc.)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Whatever you decide, I'll support you.</div>
        <div class="en-ex">Whoever comes first gets the prize.</div>
        <div class="en-ex">Whichever option you choose will be expensive.</div>
        <div class="en-ex">Whenever I see her, she's smiling.</div>
      </div>
      
      <h3>Sentential relative clauses</h3>
      <div class="grammar-example-box">
        <div class="en-ex">He resigned, which (action) surprised everyone.</div>
        <div class="en-ex">The project failed, which was unfortunate.</div>
      </div>
      
      <h3>Preposition + which в формальном стиле</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The principles upon which democracy rests...</div>
        <div class="en-ex">The extent to which technology influences society...</div>
      </div>
      
      <h3>Nominal relative clauses</h3>
      <div class="grammar-example-box">
        <div class="en-ex">What concerns me is the cost. (= The thing that concerns me)</div>
        <div class="en-ex">What we need is decisive action.</div>
      </div>
      
      <h3>Appositive clauses (пояснительные)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The fact that he lied is undeniable.</div>
        <div class="en-ex">The idea that money brings happiness is questionable.</div>
      </div>
    `
  },

  // --- DISCOURSE & PRAGMATICS ---
  {
    id: 'c2_information_structure',
    title: "Information Structure: Theme & Rheme",
    desc: "Структура информации в предложении.",
    icon: 'fa-layer-group',
    content: `
      <h3>Theme (тема) - исходная точка</h3>
      <p>То, с чего начинается предложение - известная информация:</p>
      <div class="grammar-example-box">
        <div class="en-ex"><strong>This problem</strong> requires immediate attention.</div>
      </div>
      
      <h3>Rheme (рема) - новая информация</h3>
      <p>То, что сообщается о теме:</p>
      <div class="grammar-example-box">
        <div class="en-ex">This problem <strong>requires immediate attention</strong>.</div>
      </div>
      
      <h3>Given vs New Information</h3>
      <div class="grammar-example-box">
        <div class="en-ex">A: Where's the book? (book = new)</div>
        <div class="en-ex">B: The book is on the table. (book = given, location = new)</div>
      </div>
      
      <h3>Fronting для смены темы</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Normal: I don't like this approach at all.</div>
        <div class="en-ex">Fronted: This approach I don't like at all.</div>
      </div>
      
      <h3>End-focus principle</h3>
      <p>Самая важная информация - в конец:</p>
      <div class="grammar-example-box">
        <div class="en-ex">We discussed your proposal in yesterday's meeting.</div>
        <div class="en-ex">In yesterday's meeting, we discussed your proposal.</div>
      </div>
      
      <h3>End-weight principle</h3>
      <p>Тяжелые конструкции - в конец:</p>
      <div class="grammar-example-box">
        <div class="en-ex">✓ It is important to consider all the implications.</div>
        <div class="en-ex">❌ To consider all the implications is important.</div>
      </div>
    `
  },

  // --- ADVANCED CONJUNCTIONS ---
  {
    id: 'c2_formal_connectives',
    title: "Formal Connectives & Correlatives",
    desc: "Формальные связки и коррелятивные союзы.",
    icon: 'fa-link',
    content: `
      <h3>Formal Addition</h3>
      <ul>
        <li><strong>Furthermore, Moreover</strong> - более того</li>
        <li><strong>In addition, Additionally</strong> - вдобавок</li>
        <li><strong>What is more</strong> - более того</li>
      </ul>
      
      <h3>Concession (уступка)</h3>
      <ul>
        <li><strong>Notwithstanding</strong> - несмотря на</li>
        <li><strong>Albeit</strong> - хотя (формально)</li>
        <li><strong>Granted (that)</strong> - допустим</li>
        <li><strong>While/Whilst</strong> - в то время как</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">The plan succeeded, albeit with modifications.</div>
        <div class="en-ex">Notwithstanding the difficulties, we persevered.</div>
      </div>
      
      <h3>Result/Consequence</h3>
      <ul>
        <li><strong>Consequently, As a consequence</strong></li>
        <li><strong>Accordingly, Thereby</strong></li>
        <li><strong>Hence, Whence, Thence</strong> (архаичные)</li>
      </ul>
      
      <h3>Correlative conjunctions</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Not only...but also: Not only did he lie, but he also stole.</div>
        <div class="en-ex">Neither...nor: Neither the time nor the place was suitable.</div>
        <div class="en-ex">Whether...or: Whether by design or accident, it happened.</div>
        <div class="en-ex">No sooner...than: No sooner had I arrived than he left.</div>
      </div>
      
      <h3>Parenthetical connectives</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The results, however, were inconclusive.</div>
        <div class="en-ex">This approach, nevertheless, has merit.</div>
      </div>
    `
  },

  // --- REGISTER & STYLE ---
  {
    id: 'c2_register_variation',
    title: "Register-Appropriate Grammar",
    desc: "Выбор грамматики в зависимости от регистра.",
    icon: 'fa-adjust',
    content: `
      <h3>Formal Register</h3>
      <ul>
        <li>Passive voice: <em>It is believed that...</em></li>
        <li>Nominalization: <em>The implementation of...</em></li>
        <li>Complex sentences с subordination</li>
        <li>Shall вместо will для обязательств</li>
        <li>One вместо you: <em>One should always...</em></li>
      </ul>
      
      <h3>Informal Register</h3>
      <ul>
        <li>Active voice: <em>We think that...</em></li>
        <li>Verbs вместо nouns: <em>When we implement...</em></li>
        <li>Shorter sentences</li>
        <li>Contractions: <em>don't, can't, I'll</em></li>
        <li>You для обобщений: <em>You never know...</em></li>
      </ul>
      
      <h3>Academic Register</h3>
      <div class="grammar-example-box">
        <div class="en-ex">It has been demonstrated that the correlation is significant.</div>
        <div class="en-ex">The findings indicate a robust relationship between...</div>
      </div>
      
      <h3>Legal Register</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The parties hereto agree that...</div>
        <div class="en-ex">Notwithstanding any provision to the contrary...</div>
      </div>
      
      <h3>Journalistic Register</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Officials say talks continue (опущение артиклей)</div>
        <div class="en-ex">Government announces new measures (present simple для прошлого)</div>
      </div>
    `
  },

  // --- ARCHAIC & LITERARY FORMS ---
  {
    id: 'c2_archaic_forms',
    title: "Archaic & Literary Forms",
    desc: "Устаревшие и литературные формы.",
    icon: 'fa-scroll',
    content: `
      <h3>Archaic pronouns</h3>
      <ul>
        <li><strong>Thou, thee, thy, thine</strong> - ты (устарело)</li>
        <li><strong>Ye</strong> - вы (множественное)</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">Thou shalt not steal. (Библейский стиль)</div>
      </div>
      
      <h3>Archaic verb forms</h3>
      <ul>
        <li><strong>-est, -eth</strong>: thou lovest, he loveth</li>
        <li><strong>'tis, 'twas</strong> = it is, it was</li>
      </ul>
      
      <h3>Literary/Archaic connectives</h3>
      <ul>
        <li><strong>Lest</strong> - чтобы не</li>
        <li><strong>Whilst</strong> - в то время как (британское)</li>
        <li><strong>Hitherto</strong> - до сих пор</li>
        <li><strong>Henceforth, Thenceforth</strong> - отныне, с тех пор</li>
        <li><strong>Wherein, Whereby, Whereupon</strong> - в котором, посредством, после чего</li>
      </ul>
      
      <div class="grammar-example-box">
        <div class="en-ex">He whispered, lest he be heard.</div>
        <div class="en-ex">Hitherto, the matter has not been addressed.</div>
        <div class="en-ex">The contract, wherein all terms are specified...</div>
      </div>
      
      <h3>Subjunctive в фиксированных выражениях</h3>
      <ul>
        <li>Be that as it may - как бы то ни было</li>
        <li>Suffice it to say - достаточно сказать</li>
        <li>Come what may - будь что будет</li>
        <li>God forbid - не дай Бог</li>
        <li>Heaven help us - да поможет нам небо</li>
      </ul>
      
      <h3>Inverted word order в литературе</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Rarely has such beauty been witnessed.</div>
        <div class="en-ex">Little did he know what awaited him.</div>
      </div>
    `
  },

  // --- HEDGING & BOOSTING ---
  {
    id: 'c2_hedging_boosting',
    title: "Hedging & Boosting in Academic Writing",
    desc: "Смягчение и усиление в научном стиле.",
    icon: 'fa-sliders-h',
    content: `
      <h3>Hedging (смягчение утверждений)</h3>
      <p><strong>Modal verbs:</strong></p>
      <ul>
        <li>may, might, could, would</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">This may indicate a correlation.</div>
        <div class="en-ex">The results might suggest...</div>
      </div>
      
      <p><strong>Probability adverbs:</strong></p>
      <ul>
        <li>possibly, probably, perhaps, apparently</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">This is probably due to...</div>
        <div class="en-ex">Apparently, there is a link...</div>
      </div>
      
      <p><strong>Verbs of appearance:</strong></p>
      <ul>
        <li>seem, appear, tend to, be likely to</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">The data appear to support...</div>
        <div class="en-ex">There seems to be a relationship...</div>
      </div>
      
      <p><strong>Approximation:</strong></p>
      <ul>
        <li>approximately, roughly, about, around</li>
      </ul>
      
      <h3>Boosting (усиление утверждений)</h3>
      <p><strong>Strong modals:</strong></p>
      <ul>
        <li>must, will, should</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">This will undoubtedly lead to...</div>
      </div>
      
      <p><strong>Certainty adverbs:</strong></p>
      <ul>
        <li>clearly, obviously, undoubtedly, certainly, definitely</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">Clearly, the evidence demonstrates...</div>
      </div>
      
      <p><strong>Strong verbs:</strong></p>
      <ul>
        <li>demonstrate, prove, establish, confirm</li>
      </ul>
      <div class="grammar-example-box">
        <div class="en-ex">The findings clearly demonstrate that...</div>
      </div>
    `
  },

  // --- METAPHORICAL LANGUAGE ---
  {
    id: 'c2_metaphor_grammar',
    title: "Grammatical Metaphors",
    desc: "Метафоры в грамматике.",
    icon: 'fa-magic',
    content: `
      <h3>Что такое grammatical metaphor?</h3>
      <p>Замена одного грамматического выражения другим для изменения регистра или фокуса:</p>
      
      <h3>Process → Thing (глагол → существительное)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Congruent: When the economy collapsed...</div>
        <div class="en-ex">Metaphorical: The collapse of the economy...</div>
      </div>
      
      <h3>Quality → Thing (прилагательное → существительное)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Congruent: Because it is complex...</div>
        <div class="en-ex">Metaphorical: Due to its complexity...</div>
      </div>
      
      <h3>Relator → Thing (союз → предлог)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Congruent: If you heat water...</div>
        <div class="en-ex">Metaphorical: Upon heating water...</div>
      </div>
      
      <h3>Circumstances → Participant</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Congruent: We met quickly.</div>
        <div class="en-ex">Metaphorical: Our meeting was quick.</div>
      </div>
      
      <h3>Зачем использовать?</h3>
      <ul>
        <li>Повышение формальности текста</li>
        <li>Упаковка сложной информации</li>
        <li>Создание абстрактных концептов</li>
        <li>Академический стиль письма</li>
      </ul>
    `
  },

  // --- IDIOMATIC LANGUAGE ---
  {
    id: 'c2_idioms_fixed',
    title: "Grammatical Idioms & Fixed Expressions",
    desc: "Грамматические идиомы и фиксированные выражения.",
    icon: 'fa-lock',
    content: `
      <h3>Binomials (парные выражения)</h3>
      <p>Фиксированный порядок слов:</p>
      <ul>
        <li>black and white (NOT: white and black)</li>
        <li>knife and fork</li>
        <li>ladies and gentlemen</li>
        <li>bread and butter</li>
        <li>trial and error</li>
        <li>by and large</li>
        <li>here and there</li>
        <li>now and then</li>
      </ul>
      
      <h3>Trinomials (тройные)</h3>
      <ul>
        <li>ready, willing, and able</li>
        <li>wine, women, and song</li>
        <li>lock, stock, and barrel</li>
      </ul>
      
      <h3>Formulaic expressions</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Be that as it may... (как бы то ни было)</div>
        <div class="en-ex">Suffice it to say... (достаточно сказать)</div>
        <div class="en-ex">Needless to say... (излишне говорить)</div>
        <div class="en-ex">As it were... (так сказать)</div>
        <div class="en-ex">So to speak... (так сказать)</div>
      </div>
      
      <h3>Fixed prepositions в idioms</h3>
      <div class="grammar-example-box">
        <div class="en-ex">in the nick of time</div>
        <div class="en-ex">by the skin of one's teeth</div>
        <div class="en-ex">at the drop of a hat</div>
        <div class="en-ex">for the time being</div>
      </div>
      
      <h3>Irreversible binomials</h3>
      <p>Порядок нельзя менять:</p>
      <ul>
        <li>cause and effect (NOT: effect and cause)</li>
        <li>supply and demand</li>
        <li>husband and wife</li>
      </ul>
    `
  },

  // --- STYLISTIC VARIATION ---
  {
    id: 'c2_stylistic_effect',
    title: "Stylistic Variation for Effect",
    desc: "Стилистические вариации для эффекта.",
    icon: 'fa-feather-alt',
    content: `
      <h3>Parallelism (параллелизм)</h3>
      <p>Повторение грамматической структуры:</p>
      <div class="grammar-example-box">
        <div class="en-ex">I came, I saw, I conquered.</div>
        <div class="en-ex">Government of the people, by the people, for the people.</div>
      </div>
      
      <h3>Anaphora (анафора)</h3>
      <p>Повторение в начале:</p>
      <div class="grammar-example-box">
        <div class="en-ex">We shall fight on the beaches, we shall fight on the landing grounds...</div>
      </div>
      
      <h3>Antithesis (антитеза)</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Ask not what your country can do for you; ask what you can do for your country.</div>
      </div>
      
      <h3>Ellipsis для эффекта</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Some like it hot, others cold. (опущено: like it)</div>
      </div>
      
      <h3>Fragment sentences</h3>
      <p>Преднамеренные неполные предложения:</p>
      <div class="grammar-example-box">
        <div class="en-ex">A masterpiece. Truly unforgettable.</div>
      </div>
      
      <h3>Rhetorical questions</h3>
      <div class="grammar-example-box">
        <div class="en-ex">Who could have predicted such an outcome?</div>
        <div class="en-ex">Is this not the very essence of democracy?</div>
      </div>
    `
  },

  // --- PUNCTUATION ADVANCED ---
  {
    id: 'c2_punctuation_grammar',
    title: "Advanced Punctuation",
    desc: "Продвинутая пунктуация для смысла.",
    icon: 'fa-edit',
    content: `
      <h3>Semicolon (точка с запятой)</h3>
      <p>Связывает близкие по смыслу независимые предложения:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The research was thorough; the conclusions were sound.</div>
      </div>
      <p>Перед conjunctive adverbs:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The data were inconclusive; however, trends were observable.</div>
      </div>
      
      <h3>Colon (двоеточие)</h3>
      <p>Вводит список, пояснение или цитату:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The conclusion is clear: action must be taken.</div>
        <div class="en-ex">Consider the following: cost, time, and quality.</div>
      </div>
      
      <h3>Dash (тире)</h3>
      <p>Для добавления информации или изменения направления:</p>
      <div class="grammar-example-box">
        <div class="en-ex">The results—quite unexpectedly—supported the hypothesis.</div>
        <div class="en-ex">She had one goal—to succeed.</div>
      </div>
      
      <h3>Parentheses (скобки)</h3>
      <p>Для вставных замечаний (менее важная информация):</p>
      <div class="grammar-example-box">
        <div class="en-ex">The study (conducted over five years) yielded significant data.</div>
      </div>
      
      <h3>Различия: commas, dashes, parentheses</h3>
      <div class="grammar-example-box">
        <div class="en-ex">The project, which was expensive, succeeded. (нейтрально)</div>
        <div class="en-ex">The project—which was expensive—succeeded. (подчеркивается)</div>
        <div class="en-ex">The project (which was expensive) succeeded. (менее важно)</div>
      </div>
    `
  },

  // --- REGIONAL VARIATIONS ---
  {
    id: 'c2_regional_variation',
    title: "Regional Variations in Grammar",
    desc: "Региональные вариации в грамматике.",
    icon: 'fa-globe-americas',
    content: `
      <h3>British vs American: Present Perfect</h3>
      <div class="grammar-example-box">
        <div class="en-ex">British: I've just seen him.</div>
        <div class="en-ex">American: I just saw him. (часто Past Simple)</div>
      </div>
      
      <h3>British vs American: Have/Take</h3>
      <div class="grammar-example-box">
        <div class="en-ex">British: Have a bath/shower/holiday</div>
        <div class="en-ex">American: Take a bath/shower/vacation</div>
      </div>
      
      <h3>Collective nouns</h3>
      <div class="grammar-example-box">
        <div class="en-ex">British: The team are playing well. (plural)</div>
        <div class="en-ex">American: The team is playing well. (singular)</div>
      </div>
      
      <h3>Shall</h3>
      <div class="grammar-example-box">
        <div class="en-ex">British: Shall I help you? (предложение)</div>
        <div class="en-ex">American: Should I help you? (чаще should/will)</div>
      </div>
      
      <h3>Gotten</h3>
      <div class="grammar-example-box">
        <div class="en-ex">American: I've gotten better.</div>
        <div class="en-ex">British: I've got better.</div>
      </div>
      
      <h3>Prepositions</h3>
      <div class="grammar-example-box">
        <div class="en-ex">British: at the weekend, in hospital</div>
        <div class="en-ex">American: on the weekend, in the hospital</div>
      </div>
    `
  }
]
    };
  }

  // 1. Рендер Главного меню (Выбор уровня)
  renderRoot() {
    const container = document.getElementById('grammarList');
    const detail = document.getElementById('grammarDetail');
    if (!container) return;

    container.innerHTML = '';
    container.classList.remove('hidden');
    if (detail) detail.classList.add('hidden');

    // Заголовок раздела
    const headerHtml = `
      <div style="padding: 0 0 15px 0;">
        <h3 style="margin:0 0 5px; color:var(--text-primary);">Выберите уровень:</h3>
        <p style="margin:0; font-size:0.9rem; color:var(--text-secondary);"></p>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', headerHtml);

    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    
    levels.forEach(level => {
      const count = this.data[level] ? this.data[level].length : 0;
      
      // Логика "Скоро" для пустых уровней
      const isComingSoon = count === 0; 
      const opacityStyle = isComingSoon ? 'opacity:0.6; filter:grayscale(1); cursor:default;' : 'cursor:pointer;';
      const countText = isComingSoon ? 'Скоро' : `${count} тем`;
      
      const card = document.createElement('div');
      card.className = 'level-card'; 
      card.style.cssText = `margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; padding:16px; ${opacityStyle}`;
      
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:15px;">
           <div class="level-badge ${this.getLevelColorClass(level)}" style="margin:0; width:40px; height:40px; display:flex; align-items:center; justify-content:center; font-size:1rem;">${level}</div>
           <div>
             <h3 style="margin:0; font-size:1.1rem; color:var(--text-primary);">Грамматика ${level}</h3>
             <p style="margin:0; font-size:0.8rem; color:var(--text-secondary);">${countText}</p>
           </div>
        </div>
        ${isComingSoon ? '' : '<i class="fas fa-chevron-right" style="color:var(--border-color);"></i>'}
      `;
      
      if (!isComingSoon) {
          card.onclick = () => this.renderLevel(level);
      }
      container.appendChild(card);
    });
  }

  // 2. Рендер Тем конкретного уровня
    // 2. Рендер Тем конкретного уровня
  renderLevel(level) {
    this.currentLevel = level;
    
    const listContainer = document.getElementById('grammarList');
    const detailContainer = document.getElementById('grammarDetail');

    // === ВОТ ЭТО ИСПРАВЛЕНИЕ ===
    // Принудительно показываем список и СКРЫВАЕМ урок
    if (listContainer) listContainer.classList.remove('hidden');
    if (detailContainer) detailContainer.classList.add('hidden');
    // ============================
    
    let html = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
        <button class="btn btn-secondary" onclick="window.grammar.renderRoot()" style="padding:8px 14px;">
          <i class="fas fa-arrow-left"></i>
        </button>
        <h2 style="margin:0; font-size:1.5rem; color:var(--text-primary);">Уровень ${level}</h2>
      </div>
      <div class="grammar-topics-grid">
    `;

    const topics = this.data[level] || [];

    if (topics.length === 0) {
      html += `<div class="empty-state"><p>Темы скоро появятся!</p></div>`;
    } else {
      topics.forEach(topic => {
        html += `
          <div class="grammar-topic-card" style="flex-direction:column; align-items:flex-start; cursor:default;">
            <div style="display:flex; align-items:center; gap:15px; width:100%; margin-bottom:15px;">
                <div class="grammar-topic-icon"><i class="fas ${topic.icon}"></i></div>
                <div class="grammar-topic-info">
                  <h3>${topic.title}</h3>
                  <p>${topic.desc}</p>
                </div>
            </div>
            <div style="display:flex; gap:10px; width:100%;">
                <button class="btn btn-secondary" style="flex:1; font-size:0.9rem;" onclick="window.grammar.renderLesson('${level}', '${topic.id}')">
                    <i class="fas fa-book"></i> Теория
                </button>
                <button class="btn btn-primary" style="flex:1; font-size:0.9rem;" onclick="window.app.startGrammarPractice('${topic.id}')">
                <i class="fas fa-dumbbell"></i> Практика
                </button>
            </div>
          </div>
        `;
      });
    }
    
    html += '</div>';
    listContainer.innerHTML = html;
    window.scrollTo(0,0);
  }

  // 3. Рендер Урока (Теория)
    // 3. Рендер Урока (Теория)
  renderLesson(level, topicId) {
    const topic = this.data[level].find(t => t.id === topicId);
    if (!topic) return;

    const listContainer = document.getElementById('grammarList');
    const detailContainer = document.getElementById('grammarDetail');
    
    listContainer.classList.add('hidden');
    detailContainer.classList.remove('hidden');

    // Рендерим контент
    detailContainer.innerHTML = `
        <div class="grammar-detail-header">
            <!-- Кнопке дали ID для надежности -->
            <button class="btn btn-secondary" id="grammarBackBtn">
                <i class="fas fa-arrow-left"></i> Назад
            </button>
            <h3 style="margin:0; font-size:1.1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${topic.title}
            </h3>
        </div>
        <div class="grammar-content">
            ${topic.content}
            
            <div style="margin-top:30px; padding:20px; background:var(--bg-secondary); border-radius:12px; text-align:center;">
                <p>Закрепи правило на практике!</p>
                <button class="btn btn-primary" id="grammarPracticeBtn">
                    <i class="fas fa-dumbbell"></i> Тренировка по теме
                </button>
            </div>
        </div>
    `;
    
    // === ВАЖНО: Навешиваем обработчики после создания HTML ===
    
    // 1. Кнопка Назад
    const backBtn = document.getElementById('grammarBackBtn');
    if (backBtn) {
        backBtn.onclick = () => {
            console.log('Back button clicked, rendering level:', level);
            // Вызываем метод рендера уровня
            this.renderLevel(level);
        };
    }

    // 2. Кнопка Тренировка
    const practiceBtn = document.getElementById('grammarPracticeBtn');
    if (practiceBtn) {
        practiceBtn.onclick = () => {
            console.log('Practice button clicked, topic:', topicId);
            window.app.startGrammarPractice(topicId);
        };
    }

    window.scrollTo(0,0);
  }

  getLevelColorClass(level) {
    const map = { 'A1': 'beginner', 'A2': 'elementary', 'B1': 'intermediate', 'B2': 'upper-intermediate', 'C1': 'advanced', 'C2': 'proficiency' };
    return map[level] || '';
  }
}
