import type { MapConfig } from "@monopoly/shared";
import {
  corner,
  property,
  railroad,
  utility,
  tax,
  surprise,
  treasure,
  defaultDecks,
} from "./_helpers.js";

/**
 * 🌍 Classic — global cities on the classic 40-tile ring (README §6).
 * Eight country groups: Brazil, Israel, Italy, Germany, China, France, UK, USA.
 */
export const classic: MapConfig = {
  id: "classic",
  name: "Classic",
  theme: "global",
  currency: "$",
  tiles: [
    corner(0, "start", "Start"),
    property(1, "Salvador", "brown", 60), // Brazil
    treasure(2),
    property(3, "Rio", "brown", 60), // Brazil
    tax(4, "Earnings Tax", 200),
    railroad(5, "TLV Airport"),
    property(6, "Tel Aviv", "lightblue", 100), // Israel
    property(7, "Haifa", "lightblue", 110), // Israel
    surprise(8),
    property(9, "Jerusalem", "lightblue", 120), // Israel
    corner(10, "jail", "In Prison"),
    property(11, "Venice", "pink", 130), // Italy
    utility(12, "Power Company"),
    property(13, "Milan", "pink", 140), // Italy
    property(14, "Rome", "pink", 160), // Italy
    railroad(15, "MUC Airport"),
    property(16, "Frankfurt", "orange", 180), // Germany
    treasure(17),
    property(18, "Munich", "orange", 190), // Germany
    property(19, "Berlin", "orange", 200), // Germany
    corner(20, "vacation", "Vacation"),
    property(21, "Shenzhen", "red", 210), // China
    surprise(22),
    property(23, "Beijing", "red", 220), // China
    property(24, "Shanghai", "red", 240), // China
    railroad(25, "CDG Airport"),
    property(26, "Lyon", "yellow", 260), // France
    utility(27, "Water Company"),
    property(28, "Toulouse", "yellow", 270), // France
    property(29, "Paris", "yellow", 280), // France
    corner(30, "goto_jail", "Go To Prison"),
    property(31, "Liverpool", "green", 290), // UK
    property(32, "Manchester", "green", 300), // UK
    treasure(33),
    property(34, "London", "green", 320), // UK
    railroad(35, "JFK Airport"),
    surprise(36),
    property(37, "San Francisco", "darkblue", 360), // USA
    tax(38, "Premium Tax", 75),
    property(39, "New York", "darkblue", 400), // USA
  ],
  decks: defaultDecks(),
};
