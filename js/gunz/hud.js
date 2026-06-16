// hud.js — DOM HUD updates.
import { WEAPONS } from './weapons.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      hud: $('hud'),
      hpFill: $('hp-fill'), hpText: $('hp-text'),
      apFill: $('ap-fill'), apText: $('ap-text'),
      state: $('move-state'),
      wName: $('weapon-name'), aCur: $('ammo-cur'), aMax: $('ammo-max'), aSep: $('ammo-sep'),
      slots: $('weapon-slots'), reload: $('reload-hint'),
      scoreYou: $('score-you'), scoreEnemy: $('score-enemy'), timer: $('round-timer'),
      killfeed: $('killfeed'), announce: $('announce'),
      hitmarker: $('hitmarker'), vignette: $('vignette'), dmgFlash: $('dmg-flash'),
      abDash: $('ab-dash'), abJump: $('ab-jump'),
    };
    // build weapon slots once
    this.el.slots.innerHTML = '';
    this.slotEls = WEAPONS.map((w, i) => {
      const d = document.createElement('div');
      d.className = 'slot'; d.textContent = w.icon; d.title = w.name;
      this.el.slots.appendChild(d); return d;
    });
    this._hmTimer = null;
    this._curWeapon = -1;
  }

  show(v) { this.el.hud.classList.toggle('hidden', !v); }

  setHealth(hp, maxHp, ap, maxAp) {
    this.el.hpFill.style.width = Math.max(0, hp / maxHp * 100) + '%';
    this.el.hpText.textContent = Math.ceil(hp);
    this.el.apFill.style.width = Math.max(0, ap / maxAp * 100) + '%';
    this.el.apText.textContent = Math.ceil(ap);
  }

  setWeapon(name, index, cur, max, ammoArr) {
    this.el.wName.textContent = name;
    this.el.aCur.textContent = cur;
    this.el.aMax.textContent = max;
    const inf = (max === '∞');
    this.el.aSep.style.visibility = inf ? 'hidden' : 'visible';
    this.el.aMax.style.visibility = inf ? 'hidden' : 'visible';
    if (index !== this._curWeapon) { this._curWeapon = index; }
    this.slotEls.forEach((s, i) => {
      s.classList.toggle('active', i === index);
      s.classList.toggle('empty', WEAPONS[i].mag !== Infinity && ammoArr[i] === 0);
    });
  }

  setAmmo(cur, max) { this.el.aCur.textContent = cur; this.el.aMax.textContent = max; }
  setReloading(v) { this.el.reload.classList.toggle('hidden', !v); }
  setState(text) { this.el.state.textContent = text; }
  setScore(you, enemy) { this.el.scoreYou.textContent = you; this.el.scoreEnemy.textContent = enemy; }
  setTimer(text) { this.el.timer.textContent = text; }

  setAbility(dashFrac, doubleReady) {
    const d = Math.max(0, Math.min(1, dashFrac));
    this.el.abDash.querySelector('i').style.height = (100 - d * 100) + '%';
    this.el.abDash.classList.toggle('ready', d >= 1);
    this.el.abJump.classList.toggle('ready', !!doubleReady);
  }

  hitmarker() {
    const hm = this.el.hitmarker;
    hm.classList.remove('show'); void hm.offsetWidth; hm.classList.add('show');
  }

  damage() {
    const f = this.el.dmgFlash;
    f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit');
  }

  setLowHp(v) { this.el.vignette.classList.toggle('low', v); }

  killfeed(who, victim, icon, youDied) {
    const d = document.createElement('div');
    d.className = 'kf' + (youDied ? ' you-died' : '');
    d.innerHTML = `<span class="who">${who}</span><span class="wpn">${icon}</span><span class="vic">${victim}</span>`;
    this.el.killfeed.prepend(d);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.lastChild.remove();
    setTimeout(() => d.remove(), 4200);
  }

  announce(text, style) {
    const d = document.createElement('div');
    d.className = 'an' + (style ? ' style' : '');
    d.textContent = text;
    this.el.announce.innerHTML = '';
    this.el.announce.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  }
}
