const packageId = 'temporary-hit-points-are-not-hit-points';

Hooks.once("init", () => {
    libWrapper.register(packageId, 'CONFIG.Actor.documentClass.prototype._onUpdate', async function (wrapped, data, options, userId) {
        Object.getPrototypeOf(CONFIG.Actor.documentClass).prototype._onUpdate.call(this, data, options, userId)

        const isHpUpdate = !!data.system?.attributes?.hp;
    
        if ( userId === game.userId ) {
          if ( isHpUpdate ) await this.updateBloodied(options);
          await this.updateEncumbrance(options);
          this._onUpdateExhaustion(data, options);
        }
    
        const hp = options.dnd5e?.hp;
        if ( isHpUpdate && hp && !options.isRest && !options.isAdvancement ) {
          const curr = this.system.attributes.hp;
          const changes = {
            hp: curr.value - hp.value,
            temp: curr.temp - hp.temp
          };

          //changes.total = changes.hp + changes.temp;
          changes.total = changes.hp;
    
          if ( Number.isInteger(changes.total) && (changes.total !== 0) ) {
            this._displayTokenEffect(changes);
            if ( !game.settings.get("dnd5e", "disableConcentration") && (userId === game.userId) && (changes.total < 0)
              && (options.dnd5e?.concentrationCheck !== false) ) {
              this.challengeConcentration({ dc: this.getConcentrationDC(-changes.total) });
            }
    
            /* backup in case we delete it
            if ( !game.settings.get("dnd5e", "disableConcentration") && (userId === game.userId) && (changes.total < 0)
              && (options.dnd5e?.concentrationCheck !== false) && (curr.value < curr.effectiveMax) ) {
              this.challengeConcentration({ dc: this.getConcentrationDC(-changes.total) });
            }
            */
    
    
            /**
             * A hook event that fires when an actor is damaged or healed by any means. The actual name
             * of the hook will depend on the change in hit points.
             * @function dnd5e.damageActor
             * @memberof hookEvents
             * @param {Actor5e} actor                                       The actor that had their hit points reduced.
             * @param {{hp: number, temp: number, total: number}} changes   The changes to hit points.
             * @param {object} update                                       The original update delta.
             * @param {string} userId                                       Id of the user that performed the update.
             */
            Hooks.callAll(`dnd5e.${changes.total > 0 ? "heal" : "damage"}Actor`, this, changes, data, userId);
          }
        }
    }, 'MIXED' /* optional, since this is the default type */ );
});