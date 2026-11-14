from bisect import bisect_right


class GreenhouseTask:

  def __init__(self, name, start_hour, end_hour, power_kw, hp_gain):
    self.name = name
    self.start = start_hour
    self.end = end_hour
    self.power_kw = power_kw  # Power draw during this window (e.g., 4.5 kW)
    self.hp_gain = hp_gain  # Weight: Crew HP restored by this food task


def solve_best_schedule(tasks):
  """
    Finds the non-overlapping greenhouse tasks that maximize total HP gain.
    Returns: (max_hp_gain, list_of_best_tasks)
    """
  if not tasks:
    return 0, []

  sorted_tasks = sorted(tasks, key=lambda t: t.end)
  n = len(sorted_tasks)
  end_hours = [t.end for t in sorted_tasks]

  # dp[i] = maximum HP gain possible using the first i tasks
  dp = [0] * (n + 1)

  for i in range(1, n + 1):
    current = sorted_tasks[i - 1]
    prev_idx = bisect_right(end_hours, current.start)

    take = current.hp_gain + dp[prev_idx]
    skip = dp[i - 1]
    dp[i] = max(take, skip)

  # Backtrack to find which tasks were selected
  chosen_tasks = []
  i = n
  while i > 0:
    current = sorted_tasks[i - 1]
    prev_idx = bisect_right(end_hours, current.start)

    if current.hp_gain + dp[prev_idx] >= dp[i - 1]:
      chosen_tasks.append(current)
      i = prev_idx
    else:
      i -= 1

  chosen_tasks.reverse()
  return dp[n], chosen_tasks


def simulate_day(
    all_tasks, player_chosen_names, current_hp, daily_hp_drain=30, bus_limit_kw=5.0
):
  """
    Runs one day of the lunar outpost:
    - Checks if overlapping tasks exceed the kW power bus limit.
    - Calculates end-of-day Crew HP after survival drain and food HP gain.
    """
  task_map = {t.name: t for t in all_tasks}
  chosen = [
      task_map[name] for name in player_chosen_names if name in task_map
  ]

  # 1. Check for overlapping tasks (exceeding the single-bus kW limit)
  chosen.sort(key=lambda t: t.start)
  for i in range(1, len(chosen)):
    if chosen[i].start < chosen[i - 1].end:
      combined_kw = round(chosen[i].power_kw + chosen[i - 1].power_kw, 1)
      return {
          "status": "POWER_OVERLOAD",
          "message": (
              f"Overload ({combined_kw} kW > {bus_limit_kw} kW limit) between "
              f"'{chosen[i-1].name}' and '{chosen[i].name}'!"
          ),
          "new_hp": max(0, current_hp - 25),
          "survived_day": (current_hp - 25) > 0,
      }

  # 2. Calculate HP gained from food tasks vs daily survival drain
  gained_hp = sum(t.hp_gain for t in chosen)
  max_possible_hp, best_tasks = solve_best_schedule(all_tasks)

  # Cap HP at 100
  new_hp = min(100, max(0, current_hp - daily_hp_drain + gained_hp))

  return {
      "status": "OK",
      "hp_gained": gained_hp,
      "max_possible_hp_gain": max_possible_hp,
      "daily_drain": daily_hp_drain,
      "new_hp": new_hp,
      "survived_day": new_hp > 0,
      "optimal_plan": [t.name for t in best_tasks],
  }


# --- Example Usage: Day 1 ---
if __name__ == "__main__":
  crew_hp = 80

  day_1_tasks = [
      GreenhouseTask("UV Water Sterilization", 0, 4, power_kw=3.8, hp_gain=10),
      GreenhouseTask("Red/Blue LED Boost", 2, 7, power_kw=4.8, hp_gain=18),
      GreenhouseTask("Aeroponic Root Mist", 6, 10, power_kw=3.5, hp_gain=12),
      GreenhouseTask("Algae Tank Agitation", 8, 14, power_kw=4.2, hp_gain=20),
      GreenhouseTask("Thermal Canopy Heating", 12, 18, power_kw=4.9, hp_gain=15),
      GreenhouseTask("Microgreen Harvest Cycle", 16, 22, power_kw=4.0, hp_gain=18),
  ]

  # Player selects non-overlapping tasks: 18 + 20 + 18 = +56 HP
  player_picks = [
      "Red/Blue LED Boost",
      "Algae Tank Agitation",
      "Microgreen Harvest Cycle",
  ]

  result = simulate_day(day_1_tasks, player_picks, current_hp=crew_hp)
  print(result)
