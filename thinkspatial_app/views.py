from django.shortcuts import render

from django.contrib.auth import authenticate, login, logout


# a simple controller for the default start page.
def index(request):

    context = {'user': request.user}
    return render(request, "index.html", context)
