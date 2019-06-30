// ==UserScript==
// @name         Gemifier
// @version      1.0
// @description  Simple script to gemify items
// @author       Xxmarijnw
// @include      *steamcommunity.com/*/inventory*
// @supportURL   https://steamcommunity.com/profiles/76561198179914647
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==

/*

   Copyright 2018 Xxmarijnw

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/

(function() {
    'use strict';

    if(g_steamID == g_ActiveInventory.m_steamid) {
        var selected = [], appids = [], contextids = [], errCount = 0, doneCount = 0, total_goo = 0, modal, disallowedTypes = ["Guest Pass", "Steam Gems"];

        function Button(text, loc) {
            var button = document.createElement('a');

            button.className = "btn_green_white_innerfade btn_medium new_trade_offer_btn gemifySelect";
            button.style.marginRight = "12px";

            var span = document.createElement('span');
            span.innerHTML = text;
            button.appendChild(span);

            loc = document.getElementsByClassName(loc);
            loc[0].prepend(button);

            this.setText = function(setText) {
                span.innerHTML = setText;
            };

            this.setClass = function(setClass) {
                button.setAttribute("class", "btn_green_white_innerfade btn_medium new_trade_offer_btn " + setClass);
            };
        }

        var gemifyButton = new Button("Gemify Multiple", "inventory_rightnav");

        var clicked = 0;
        $J(".gemifySelect").click(function() {
            if(clicked == 0) {
                gemifyButton.setText("Gemify Selections");
                clicked = 1;
            } else if(clicked == 1) {
                gemifySelected();
                console.log(selected);

                clicked = 2;
            }
        });

        $J(".item").click(function() {
            if((clicked === 1) && (disallowedTypes.indexOf(g_ActiveInventory.selectedItem.description.type) === -1)) {
                var orig = $J(this).find("a").attr("href");

                if(orig.substring(0, 7) == "#753_6_") {
                    var item = ReadInventoryHash(orig);

                    var contextid = item.contextid;
                    var assetid = item.assetid;

                    let index = selected.indexOf(assetid);
                    if(index > -1) {
                        selected.splice(index, 1);
                        appids.splice(index, 1);
                        contextids.splice(index, 1);

                        if(selected.indexOf(assetid) === -1) {
                            this.parentNode.style.border = '';
                            this.parentNode.style.boxSizing = '';
                        }
                    } else {
                        selected.push(assetid);
                        contextids.push(contextid);
                        appids.push((g_ActiveInventory.selectedItem.description.market_hash_name.match(/^([0-9]+)-/) || [])[1]);

                        this.parentNode.style.boxSizing = 'border-box';
                        this.parentNode.style.border = '2px dashed red';
                    }
                }
            }
        });

        function gemifySelected()
        {
            gemifyButton.setClass("gemifying");
            gemifyButton.setText("Gemifying... (0 / " + selected.length + ")");

            modal = ShowBlockingWaitDialog("Gemifying items...", "Items gemified: 0 / " + selected.length + " | Amount of gems: " + total_goo);

            if(selected.length === 0)
            {
                gemifyButton.setText("Nothing to gemify");
                throw new Error("Empty selected array");
            }

            for(var i = 0; i < selected.length; i++)
            {
                setTimeout(gemify(appids[i], contextids[i], selected[i]), 750);
            }
        }

        function gemify(appid, contextid, itemid) {
            var rgAJAXParams = {
                sessionid: g_sessionID,
                appid: appid,
                assetid: itemid,
                contextid: contextid
            };

            var strActionURL = g_strProfileURL + "/ajaxgetgoovalue/";

            $J.get( strActionURL, rgAJAXParams ).done(function(data) {
                strActionURL = g_strProfileURL + "/ajaxgrindintogoo/";
                rgAJAXParams.goo_value_expected = data.goo_value;

                total_goo += parseFloat(data.goo_value);

                $J.post( strActionURL, rgAJAXParams).done(function(data) {
                    const element = document.getElementById("753_" + contextid + "_" + itemid);
                    element.parentNode.style.opacity = '0.3';
                    element.parentNode.style.border = '';
                    element.parentNode.style.boxSizing = '';

                }).fail( function() {
                    if(errCount > 10){
                        console.log('Could not connect to network. Try again manually for this item... (tried 10 times)');
                    } else {
                        setTimeout(gemify(appid, contextid, itemid), 750);
                    }

                    errCount++;
                }).success( function() {
                    errCount = 0;
                    doneCount++;

                    gemifyButton.setText("Gemifying... (" + doneCount + " / " + selected.length + ")");

                    if(modal !== null) {
                        modal.Dismiss();
                    }

                    modal = ShowBlockingWaitDialog("Gemifying items...", "Items gemified: " + doneCount + " / " + selected.length + " | Amount of gems: " + total_goo, "BlockingWaitDialog");

                    if(doneCount == selected.length) {
                        gemifyButton.setText("Finished");

                        modal.Dismiss();
                        ShowAlertDialog("Finished gemifying!", "Gemified a total of " + doneCount + " items which gave you " + total_goo + " gems!");
                    }
                });
            }).fail(function() {
                if(errCount > 4){
                    console.log('Could not connect to network. Try again manually for this item... (tried 5 times)');
                } else {
                    setTimeout(gemify(appid, contextid, itemid), 750);
                }

                errCount++;
            }).success(function() {
                errCount = 0;
            });
        }
    }
})();
